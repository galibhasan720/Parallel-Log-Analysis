"""Static schedule: N equal byte chunks → N workers."""

from __future__ import annotations

from pathlib import Path

from app.hpc.chunking.byte_chunker import byte_ranges, file_size


def build_chunk_specs(
    path: str | Path,
    workers: int,
    *,
    parser_name: str = "application",
) -> list[dict]:
    total = file_size(path)
    n = max(1, workers)
    specs: list[dict] = []
    for i, (start, end) in enumerate(byte_ranges(total, n)):
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
