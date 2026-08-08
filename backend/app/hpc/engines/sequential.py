"""Sequential baseline processor. Same analysis Day 3 will reuse with workers=N."""

from __future__ import annotations

from typing import Iterable

from app.hpc.engines.statistics import apply_event
from app.hpc.input_source import FileInputSource, InputSource
from app.hpc.parsers.base import LogParser
from app.hpc.parsers.registry import ParserRegistry, default_registry
from app.hpc.partial import PartialResult, empty_partial


def analyze_lines(
    lines: Iterable[str],
    parser: LogParser,
    *,
    worker_id: int = 0,
) -> PartialResult:
    partial = empty_partial(worker_id=worker_id)
    for line in lines:
        partial["records_processed"] += 1
        event = parser.parse_line(line)
        if event is None:
            if not line.strip():
                # Blank lines are not records; undo increment.
                partial["records_processed"] -= 1
                continue
            partial["invalid_records"] += 1
            continue
        partial["valid_records"] += 1
        apply_event(partial, event)
    return partial


def analyze_source(
    source: InputSource,
    parser: LogParser,
    *,
    worker_id: int = 0,
) -> PartialResult:
    return analyze_lines(source.iter_lines(), parser, worker_id=worker_id)


def analyze_file(
    path: str,
    *,
    parser_name: str | None = None,
    registry: ParserRegistry | None = None,
    worker_id: int = 0,
) -> PartialResult:
    source = FileInputSource(path)
    registry = registry or default_registry()
    if parser_name:
        parser = registry.get(parser_name)
    else:
        parser = registry.parser_for_lines(source.sample_lines())
    return analyze_source(source, parser, worker_id=worker_id)
