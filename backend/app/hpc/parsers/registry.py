"""ParserRegistry: format detection → specific parser → Canonical LogEvent."""

from __future__ import annotations

import re

from app.hpc.parsers.application import ApplicationParser
from app.hpc.parsers.base import LogParser

_LEVEL_HINT = re.compile(
    r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*\b(INFO|WARNING|WARN|ERROR|CRITICAL|DEBUG)\b",
    re.IGNORECASE,
)


class ParserRegistry:
    def __init__(self) -> None:
        self._parsers: dict[str, LogParser] = {
            "application": ApplicationParser(),
        }

    def get(self, name: str) -> LogParser:
        try:
            return self._parsers[name]
        except KeyError as exc:
            raise KeyError(f"Unknown parser '{name}'. Registered: {sorted(self._parsers)}") from exc

    def detect(self, sample_lines: list[str]) -> str:
        non_empty = [line for line in sample_lines if line.strip()]
        if not non_empty:
            raise ValueError("Cannot detect log format from empty sample")
        hits = sum(1 for line in non_empty if _LEVEL_HINT.search(line))
        if hits / len(non_empty) >= 0.5:
            return "application"
        raise ValueError(
            "Could not detect a supported log format. "
            "Day 2 supports generic application logs only."
        )

    def parser_for_lines(self, sample_lines: list[str]) -> LogParser:
        return self.get(self.detect(sample_lines))


def default_registry() -> ParserRegistry:
    return ParserRegistry()
