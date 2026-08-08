"""Picklable ProcessPool worker: chunk spec → partial result."""

from __future__ import annotations

from app.hpc.chunking.boundary_alignment import iter_aligned_lines
from app.hpc.engines.sequential import analyze_lines
from app.hpc.parsers.registry import default_registry
from app.hpc.partial import PartialResult


def process_chunk(spec: dict) -> PartialResult:
    """Top-level worker entry. Spec must contain only picklable primitives."""
    parser = default_registry().get(spec["parser_name"])
    lines = iter_aligned_lines(spec["path"], int(spec["start"]), int(spec["end"]))
    return analyze_lines(lines, parser, worker_id=int(spec["worker_id"]))
