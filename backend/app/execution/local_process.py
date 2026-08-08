"""Stage 1 backend: local ProcessPoolExecutor wrapping the HPC engine."""

from __future__ import annotations

from typing import Any

from app.hpc.engines.parallel import analyze_file_parallel
from app.hpc.engines.sequential import analyze_file

from .base import ExecutionBackend


class LocalProcessBackend(ExecutionBackend):
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        path = job_spec.get("input") or job_spec.get("path")
        if not path:
            raise ValueError("job_spec must include 'input' or 'path'")
        mode = str(job_spec.get("mode", "sequential")).lower()
        workers = int(job_spec.get("workers", 1))
        fmt = job_spec.get("format") or job_spec.get("parser")
        parser_name = None if fmt in (None, "auto") else str(fmt)

        if mode == "parallel":
            return analyze_file_parallel(
                str(path),
                workers=workers,
                parser_name=parser_name,
            )
        return analyze_file(str(path), parser_name=parser_name, worker_id=0)
