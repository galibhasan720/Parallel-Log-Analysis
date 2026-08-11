"""Public system capabilities for the Day 6 UI."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.schemas import CapabilitiesOut
from app.core.config import settings
from app.execution.registry import AVAILABLE_BACKENDS, backend_status

router = APIRouter()


@router.get("/capabilities", response_model=CapabilitiesOut)
def capabilities() -> CapabilitiesOut:
    return CapabilitiesOut(
        execution_backend=settings.execution_backend,
        execution_backends=list(AVAILABLE_BACKENDS),
        backend_status=backend_status(),
        max_workers=settings.max_workers,
        max_upload_bytes=settings.max_upload_bytes,
        parsers=["application"],
        modes=["sequential", "parallel"],
        schedules=["static", "dynamic"],
        parser_version=settings.parser_version,
        analysis_version=settings.analysis_version,
    )
