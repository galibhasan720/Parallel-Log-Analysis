"""Parallel file analysis with dynamic chunk granularity (ProcessPool)."""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor

from app.hpc.aggregation.reducer import merge_partials
from app.hpc.input_source import FileInputSource
from app.hpc.parsers.registry import default_registry
from app.hpc.partial import PartialResult
from app.hpc.scheduling.dynamic_scheduler import build_dynamic_chunk_specs
from app.hpc.workers.process_worker import process_chunk


def analyze_file_dynamic(
    path: str,
    *,
    workers: int = 2,
    chunks_per_worker: int = 8,
    parser_name: str | None = None,
) -> PartialResult:
    source = FileInputSource(path)
    registry = default_registry()
    name = parser_name or registry.detect(source.sample_lines())
    n = max(1, int(workers))
    specs = build_dynamic_chunk_specs(
        path,
        n,
        chunks_per_worker=chunks_per_worker,
        parser_name=name,
    )
    if not specs:
        return process_chunk(
            {"path": path, "start": 0, "end": 0, "worker_id": 0, "parser_name": name}
        )
    if len(specs) == 1:
        return process_chunk(specs[0])
    if n == 1:
        partials = [process_chunk(spec) for spec in specs]
        return merge_partials(partials, worker_id=-1)
    with ProcessPoolExecutor(max_workers=n) as pool:
        partials = list(pool.map(process_chunk, specs))
    return merge_partials(partials, worker_id=-1)
