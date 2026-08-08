"""Parallel file analysis via ProcessPoolExecutor + static byte chunks."""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor

from app.hpc.aggregation.reducer import merge_partials
from app.hpc.input_source import FileInputSource
from app.hpc.parsers.registry import default_registry
from app.hpc.partial import PartialResult
from app.hpc.scheduling.static_scheduler import build_chunk_specs
from app.hpc.workers.process_worker import process_chunk


def analyze_file_parallel(
    path: str,
    *,
    workers: int = 2,
    parser_name: str | None = None,
) -> PartialResult:
    source = FileInputSource(path)
    registry = default_registry()
    name = parser_name or registry.detect(source.sample_lines())
    n = max(1, int(workers))
    specs = build_chunk_specs(path, n, parser_name=name)
    if n == 1:
        return process_chunk(specs[0])
    with ProcessPoolExecutor(max_workers=n) as pool:
        partials = list(pool.map(process_chunk, specs))
    return merge_partials(partials, worker_id=-1)
