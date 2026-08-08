"""ExecutionBackend contract. Application calls backend.execute(job_spec)."""

from abc import ABC, abstractmethod
from typing import Any


class ExecutionBackend(ABC):
    @abstractmethod
    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        """Run an analysis job and return evidence / aggregates."""
        raise NotImplementedError
