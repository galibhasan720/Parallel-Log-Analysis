"""Canonical Log Event — Stage 1 minimum plus optional HTTP fields."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class LogEvent:
    timestamp: str
    level: str
    service: str
    message: str
    ip_address: str | None = None
    http_method: str | None = None
    http_path: str | None = None
    status_code: int | None = None
    response_time_ms: int | None = None
