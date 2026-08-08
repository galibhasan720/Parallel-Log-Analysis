"""Generic application log parser (synth + TIMESTAMP LEVEL service message)."""

from __future__ import annotations

import re

from app.hpc.models import LogEvent

# 2026-08-01T00:00:00.018Z INFO auth-service cache hit ip=... PUT /api/login status=404 latency_ms=3687
_APP_LINE = re.compile(
    r"^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+"
    r"(?P<level>INFO|WARNING|WARN|ERROR|CRITICAL|DEBUG)\s+"
    r"(?P<service>\S+)\s+"
    r"(?P<message>.+?)"
    r"(?:\s+ip=(?P<ip>\S+))?"
    r"(?:\s+(?P<method>GET|POST|PUT|PATCH|DELETE)\s+(?P<path>\S+))?"
    r"(?:\s+status=(?P<status>\d{3}))?"
    r"(?:\s+latency_ms=(?P<latency>\d+))?"
    r"\s*$",
    re.IGNORECASE,
)


class ApplicationParser:
    name = "application"

    def parse_line(self, line: str) -> LogEvent | None:
        text = line.strip()
        if not text:
            return None
        match = _APP_LINE.match(text)
        if not match:
            return None
        status_raw = match.group("status")
        latency_raw = match.group("latency")
        level = match.group("level").upper()
        if level == "WARN":
            level = "WARNING"
        return LogEvent(
            timestamp=match.group("timestamp"),
            level=level,
            service=match.group("service"),
            message=match.group("message").strip(),
            ip_address=match.group("ip"),
            http_method=(match.group("method") or None),
            http_path=match.group("path"),
            status_code=int(status_raw) if status_raw else None,
            response_time_ms=int(latency_raw) if latency_raw else None,
        )
