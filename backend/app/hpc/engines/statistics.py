"""Update a partial result from one Canonical LogEvent."""

from __future__ import annotations

from app.hpc.models import LogEvent
from app.hpc.partial import PartialResult, increment

_ERROR_LEVELS = frozenset({"ERROR", "CRITICAL"})
_SENSITIVE_PREFIXES = ("/admin", "/.env", "/config")

_PATTERN_RULES: tuple[tuple[str, str], ...] = (
    ("database connection timeout", "database_timeout"),
    ("failed password", "authentication_failure"),
    ("sql syntax", "sql_syntax"),
    ("upstream 502", "upstream_502"),
    ("payment gateway unreachable", "gateway_unreachable"),
    ("crash loop", "crash_loop"),
)


def classify_error_pattern(message: str) -> str:
    lowered = message.lower()
    for needle, key in _PATTERN_RULES:
        if needle in lowered:
            return key
    return "other_error"


def is_auth_failure(event: LogEvent) -> bool:
    if event.status_code == 401:
        return True
    return "failed password" in event.message.lower()


def sensitive_path_key(path: str | None) -> str | None:
    if not path:
        return None
    lowered = path.lower()
    for prefix in _SENSITIVE_PREFIXES:
        if lowered == prefix or lowered.startswith(prefix + "/") or lowered.startswith(prefix + "?"):
            return prefix
    return None


def minute_bucket(timestamp: str) -> str:
    if len(timestamp) >= 16:
        return timestamp[:16]
    return timestamp


def apply_event(partial: PartialResult, event: LogEvent) -> None:
    increment(partial["level_counts"], event.level)
    increment(partial["service_counts"], event.service)
    if event.status_code is not None:
        increment(partial["status_counts"], str(event.status_code))
        if event.status_code >= 500:
            partial["count_5xx"] = int(partial.get("count_5xx", 0)) + 1
    if event.level in _ERROR_LEVELS:
        increment(partial["error_patterns"], classify_error_pattern(event.message))
    if event.http_path:
        increment(partial["path_counts"], event.http_path)
    if event.ip_address:
        increment(partial["ip_counts"], event.ip_address)
        if event.http_path:
            paths = partial["paths_by_ip"].setdefault(event.ip_address, {})
            increment(paths, event.http_path)
        if event.status_code == 404:
            increment(partial["not_found_by_ip"], event.ip_address)
        if is_auth_failure(event):
            increment(partial["auth_fail_by_ip"], event.ip_address)
            minutes = partial["auth_fail_by_ip_minute"].setdefault(event.ip_address, {})
            increment(minutes, minute_bucket(event.timestamp))
    sensitive = sensitive_path_key(event.http_path)
    if sensitive:
        increment(partial["sensitive_path_counts"], sensitive)
