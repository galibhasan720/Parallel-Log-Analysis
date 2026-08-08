"""Parser protocol: one line → Canonical LogEvent or None if invalid."""

from __future__ import annotations

from typing import Protocol

from app.hpc.models import LogEvent


class LogParser(Protocol):
    name: str

    def parse_line(self, line: str) -> LogEvent | None: ...
