"""Associative partial-result contract (Section 6.4). Never dump all records."""

from __future__ import annotations

from typing import Any


PartialResult = dict[str, Any]

_FLAT_COUNT_FIELDS = (
    "level_counts",
    "status_counts",
    "error_patterns",
    "service_counts",
    "path_counts",
    "ip_counts",
    "auth_fail_by_ip",
    "not_found_by_ip",
    "sensitive_path_counts",
)

_NESTED_COUNT_FIELDS = (
    "paths_by_ip",
    "auth_fail_by_ip_minute",
)


def empty_partial(*, worker_id: int = 0) -> PartialResult:
    return {
        "worker_id": worker_id,
        "records_processed": 0,
        "valid_records": 0,
        "invalid_records": 0,
        "count_5xx": 0,
        "level_counts": {},
        "status_counts": {},
        "error_patterns": {},
        "service_counts": {},
        "path_counts": {},
        "ip_counts": {},
        "auth_fail_by_ip": {},
        "not_found_by_ip": {},
        "sensitive_path_counts": {},
        "paths_by_ip": {},
        "auth_fail_by_ip_minute": {},
    }


def increment(counter: dict[str, int], key: str, amount: int = 1) -> None:
    counter[key] = counter.get(key, 0) + amount


def _merge_nested(dest: dict[str, dict[str, int]], src: dict) -> None:
    for outer, inner in (src or {}).items():
        bucket = dest.setdefault(str(outer), {})
        for key, value in (inner or {}).items():
            increment(bucket, str(key), int(value))


def merge_partials(partials: list[PartialResult], *, worker_id: int = -1) -> PartialResult:
    """Deterministic reduce. Associative: counts/histograms only."""
    merged = empty_partial(worker_id=worker_id)
    for part in partials:
        merged["records_processed"] += int(part.get("records_processed", 0))
        merged["valid_records"] += int(part.get("valid_records", 0))
        merged["invalid_records"] += int(part.get("invalid_records", 0))
        merged["count_5xx"] += int(part.get("count_5xx", 0))
        for field in _FLAT_COUNT_FIELDS:
            src = part.get(field) or {}
            dest: dict[str, int] = merged[field]
            for key, value in src.items():
                increment(dest, str(key), int(value))
        for field in _NESTED_COUNT_FIELDS:
            _merge_nested(merged[field], part.get(field) or {})
    return merged
