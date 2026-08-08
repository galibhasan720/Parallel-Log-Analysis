"""Associative partial-result contract (Section 6.4). Never dump all records."""

from __future__ import annotations

from typing import Any


PartialResult = dict[str, Any]


def empty_partial(*, worker_id: int = 0) -> PartialResult:
    return {
        "worker_id": worker_id,
        "records_processed": 0,
        "valid_records": 0,
        "invalid_records": 0,
        "level_counts": {},
        "status_counts": {},
        "error_patterns": {},
        "service_counts": {},
    }


def increment(counter: dict[str, int], key: str, amount: int = 1) -> None:
    counter[key] = counter.get(key, 0) + amount


def merge_partials(partials: list[PartialResult], *, worker_id: int = -1) -> PartialResult:
    """Deterministic reduce for Day 3. Associative: counts/histograms only."""
    merged = empty_partial(worker_id=worker_id)
    for part in partials:
        merged["records_processed"] += int(part.get("records_processed", 0))
        merged["valid_records"] += int(part.get("valid_records", 0))
        merged["invalid_records"] += int(part.get("invalid_records", 0))
        for field in ("level_counts", "status_counts", "error_patterns", "service_counts"):
            src = part.get(field) or {}
            dest: dict[str, int] = merged[field]
            for key, value in src.items():
                increment(dest, str(key), int(value))
    return merged
