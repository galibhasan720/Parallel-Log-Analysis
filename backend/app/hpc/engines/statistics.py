"""Update a partial result from one Canonical LogEvent."""

from __future__ import annotations

from app.hpc.models import LogEvent
from app.hpc.partial import PartialResult, increment

_ERROR_LEVELS = frozenset({"ERROR", "CRITICAL"})

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


def apply_event(partial: PartialResult, event: LogEvent) -> None:
    increment(partial["level_counts"], event.level)
    increment(partial["service_counts"], event.service)
    if event.status_code is not None:
        increment(partial["status_counts"], str(event.status_code))
    if event.level in _ERROR_LEVELS:
        increment(partial["error_patterns"], classify_error_pattern(event.message))
