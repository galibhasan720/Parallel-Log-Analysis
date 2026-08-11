"""Dynamic ProcessPool backend (many chunks, fewer workers)."""

from __future__ import annotations

from typing import Any

from app.execution.base import ExecutionBackend
from app.hpc.engines.dynamic import analyze_file_dynamic
from app.hpc.engines.finalize import finalize_analysis
from app.hpc.engines.sequential import analyze_file


class DynamicBackend(ExecutionBackend):
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        path = job_spec.get("input") or job_spec.get("path")
        if not path:
            raise ValueError("job_spec must include 'input' or 'path'")
        mode = str(job_spec.get("mode", "parallel")).lower()
        workers = max(1, int(job_spec.get("workers", 1)))
        fmt = job_spec.get("format") or job_spec.get("parser")
        parser_name = None if fmt in (None, "auto") else str(fmt)
        chunks_per_worker = int(job_spec.get("chunks_per_worker") or job_spec.get("chunk_factor") or 8)
        chunk_mb = job_spec.get("chunk_mb")
        if chunk_mb is not None:
            # Approximate factor from target chunk size when provided
            size = Path_size(str(path))
            target = max(1, int(float(chunk_mb) * 1024 * 1024))
            n_chunks = max(workers, (size + target - 1) // target)
            chunks_per_worker = max(1, n_chunks // workers)

        if mode == "sequential" or workers <= 1:
            result = analyze_file(str(path), parser_name=parser_name, worker_id=0)
        else:
            result = analyze_file_dynamic(
                str(path),
                workers=workers,
                chunks_per_worker=chunks_per_worker,
                parser_name=parser_name,
            )
        return finalize_analysis(result)


def Path_size(path: str) -> int:
    from pathlib import Path

    return Path(path).stat().st_size
