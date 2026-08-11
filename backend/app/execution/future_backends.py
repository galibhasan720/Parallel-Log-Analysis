"""Future stubs kept for roadmap; Stage 2 implements MPI/OpenMP in dedicated modules."""

from typing import Any

from .base import ExecutionBackend


class DistributedBackend(ExecutionBackend):
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError("Multi-node distributed workers — future stage")


class StreamingBackend(ExecutionBackend):
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError("Stage 4+ continuous processing")
