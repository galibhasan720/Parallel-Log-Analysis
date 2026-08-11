"""OpenMP backend wrapping the native shared-memory worker."""

from __future__ import annotations

from typing import Any

from app.execution.base import ExecutionBackend
from app.hpc.engines.finalize import finalize_analysis
from app.hpc.engines.openmp_engine import analyze_file_openmp


class OpenMPBackend(ExecutionBackend):
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        path = job_spec.get("input") or job_spec.get("path")
        if not path:
            raise ValueError("job_spec must include 'input' or 'path'")
        workers = max(1, int(job_spec.get("workers", 1)))
        fmt = job_spec.get("format") or job_spec.get("parser")
        parser_name = None if fmt in (None, "auto") else str(fmt)
        partial = analyze_file_openmp(
            str(path),
            workers=workers,
            parser_name=parser_name,
        )
        return finalize_analysis(partial)
