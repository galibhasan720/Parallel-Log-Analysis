"""Structured evidence findings for humans and AI (not raw logs)."""

from __future__ import annotations

from typing import Any


def make_finding(
    *,
    finding_id: str,
    finding_type: str,
    severity: str,
    summary: str,
    event_count: int,
    source_ips: list[str] | None = None,
    affected_service: str | None = None,
    confidence: float = 0.7,
    evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "finding_id": finding_id,
        "type": finding_type,
        "severity": severity,
        "confidence": confidence,
        "summary": summary,
        "affected_service": affected_service,
        "source_ips": source_ips or [],
        "event_count": int(event_count),
        "evidence": evidence or {},
    }
