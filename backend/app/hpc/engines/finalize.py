"""Attach top-N lists and security findings after reduction."""

from __future__ import annotations

from typing import Any

from app.hpc.engines.analytics import attach_top_n
from app.security.heuristics import detect_findings


def finalize_analysis(partial: dict[str, Any], *, top_n: int = 10) -> dict[str, Any]:
    out = attach_top_n(partial, n=top_n)
    out["findings"] = detect_findings(partial)
    return out
