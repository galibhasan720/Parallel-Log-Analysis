"""Future execution backends (not implemented in Stage 1)."""

from typing import Any

from .base import ExecutionBackend


class MPIBackend(ExecutionBackend):
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError("Stage 3+ distributed HPC")


class DistributedBackend(ExecutionBackend):
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError("Stage 3+ distributed workers")


class StreamingBackend(ExecutionBackend):
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError("Stage 4+ continuous processing")
