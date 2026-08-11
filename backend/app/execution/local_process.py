"""Update LocalProcessBackend: support schedule=static|dynamic via job_spec."""

from __future__ import annotations

from typing import Any

from app.hpc.engines.dynamic import analyze_file_dynamic
from app.hpc.engines.finalize import finalize_analysis
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
        schedule = str(job_spec.get("schedule", "static")).lower()

        if mode == "parallel" and schedule == "dynamic":
            result = analyze_file_dynamic(
                str(path),
                workers=max(1, workers),
                chunks_per_worker=int(job_spec.get("chunks_per_worker") or 8),
                parser_name=parser_name,
            )
        elif mode == "parallel":
            result = analyze_file_parallel(
                str(path),
                workers=workers,
                parser_name=parser_name,
            )
        else:
            result = analyze_file(str(path), parser_name=parser_name, worker_id=0)
        return finalize_analysis(result)
