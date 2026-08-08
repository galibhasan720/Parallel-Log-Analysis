"""Public system capabilities for the Day 6 UI."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.schemas import CapabilitiesOut
from app.core.config import settings

router = APIRouter()


@router.get("/capabilities", response_model=CapabilitiesOut)
def capabilities() -> CapabilitiesOut:
    return CapabilitiesOut(
        execution_backend=settings.execution_backend,
        max_workers=settings.max_workers,
        max_upload_bytes=settings.max_upload_bytes,
        parsers=["application"],
        modes=["sequential", "parallel"],
        parser_version=settings.parser_version,
        analysis_version=settings.analysis_version,
    )
