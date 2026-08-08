"""Stage 1 backend: local ProcessPoolExecutor. Implement on Day 3–5."""

from typing import Any

from .base import ExecutionBackend


class LocalProcessBackend(ExecutionBackend):
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError("LocalProcessBackend — Day 3+ HPC engine")
