"""Split finalize_analysis output + reproducibility hash."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from app.core.config import settings


def configuration_hash(
    *,
    mode: str,
    workers: int,
    fmt: str | None,
    backend: str | None = None,
    schedule: str | None = None,
    chunks_per_worker: int | None = None,
) -> str:
    payload = {
        "execution_backend": backend or settings.execution_backend,
        "parser_version": settings.parser_version,
        "analysis_version": settings.analysis_version,
        "mode": mode,
        "workers": workers,
        "format": fmt or "auto",
        "schedule": schedule or "static",
        "chunks_per_worker": chunks_per_worker,
    }
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def split_finalize(result: dict[str, Any]) -> tuple[dict, dict, dict, dict]:
    summary = {
        "records_processed": result.get("records_processed"),
        "valid_records": result.get("valid_records"),
        "invalid_records": result.get("invalid_records"),
        "level_counts": result.get("level_counts"),
        "service_counts": result.get("service_counts"),
        "status_counts": result.get("status_counts"),
        "top_endpoints": result.get("top_endpoints"),
        "top_ips": result.get("top_ips"),
        "top_services": result.get("top_services"),
        "top_status_codes": result.get("top_status_codes"),
    }
    errors = {
        "error_patterns": result.get("error_patterns"),
        "count_5xx": result.get("count_5xx"),
        "invalid_records": result.get("invalid_records"),
    }
    security = {"findings": result.get("findings") or []}
    evidence = {
        "path_counts": result.get("path_counts"),
        "ip_counts": result.get("ip_counts"),
        "auth_fail_by_ip": result.get("auth_fail_by_ip"),
        "not_found_by_ip": result.get("not_found_by_ip"),
        "sensitive_path_counts": result.get("sensitive_path_counts"),
        "paths_by_ip": result.get("paths_by_ip"),
        "auth_fail_by_ip_minute": result.get("auth_fail_by_ip_minute"),
    }
    return summary, errors, security, evidence
