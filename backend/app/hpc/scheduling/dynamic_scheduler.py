"""Dynamic schedule: many small byte chunks pulled by a ProcessPool."""

from __future__ import annotations

from pathlib import Path

from app.hpc.chunking.byte_chunker import byte_ranges, file_size


def build_dynamic_chunk_specs(
    path: str | Path,
    workers: int,
    *,
    chunks_per_worker: int = 8,
    parser_name: str = "application",
) -> list[dict]:
    """Return more chunks than workers so the pool can pull work dynamically."""
    total = file_size(path)
    n_workers = max(1, int(workers))
    factor = max(1, int(chunks_per_worker))
    n_chunks = max(n_workers * factor, n_workers)
    if total > 0:
        n_chunks = min(n_chunks, total)
    specs: list[dict] = []
    for i, (start, end) in enumerate(byte_ranges(total, n_chunks)):
        specs.append(
            {
                "path": str(path),
                "start": start,
                "end": end,
                "worker_id": i,
                "parser_name": parser_name,
            }
        )
    return specs
