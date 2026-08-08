"""Deterministic Stage 1 security heuristics. Honest wording only."""

from __future__ import annotations

from typing import Any

from app.evidence.findings import make_finding

AUTH_FAIL_TOTAL = 40
AUTH_FAIL_PER_MINUTE = 15
FIVE_XX_RATE = 0.15
DISTINCT_PATHS = 6
SCAN_404_COUNT = 20
SCAN_404_PATHS = 4
SENSITIVE_TOTAL = 10


def detect_findings(partial: dict[str, Any]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    seq = 1

    auth_by_ip = partial.get("auth_fail_by_ip") or {}
    auth_minutes = partial.get("auth_fail_by_ip_minute") or {}
    burst_ips: list[str] = []
    burst_evidence: list[dict[str, Any]] = []
    for ip, total in sorted(auth_by_ip.items(), key=lambda kv: (-int(kv[1]), kv[0])):
        minutes = auth_minutes.get(ip) or {}
        peak = max((int(v) for v in minutes.values()), default=0)
        if int(total) >= AUTH_FAIL_TOTAL or peak >= AUTH_FAIL_PER_MINUTE:
            burst_ips.append(ip)
            burst_evidence.append(
                {"ip": ip, "failed_login_count": int(total), "peak_per_minute": peak}
            )
    if burst_ips:
        findings.append(
            make_finding(
                finding_id=f"finding-{seq:03d}",
                finding_type="AUTHENTICATION_FAILURE_SPIKE",
                severity="HIGH",
                summary="Potential brute-force activity detected.",
                event_count=sum(item["failed_login_count"] for item in burst_evidence),
                source_ips=burst_ips[:20],
                affected_service="auth-service",
                confidence=0.82,
                evidence={
                    "threshold_total": AUTH_FAIL_TOTAL,
                    "threshold_per_minute": AUTH_FAIL_PER_MINUTE,
                    "ips": burst_evidence[:20],
                },
            )
        )
        seq += 1

    valid = int(partial.get("valid_records") or 0)
    count_5xx = int(partial.get("count_5xx") or 0)
    rate = (count_5xx / valid) if valid else 0.0
    if valid and rate > FIVE_XX_RATE:
        findings.append(
            make_finding(
                finding_id=f"finding-{seq:03d}",
                finding_type="HTTP_5XX_SPIKE",
                severity="MEDIUM",
                summary="HTTP 5xx rate is above the configured baseline.",
                event_count=count_5xx,
                confidence=0.75,
                evidence={
                    "count_5xx": count_5xx,
                    "valid_records": valid,
                    "rate": round(rate, 4),
                    "baseline": FIVE_XX_RATE,
                },
            )
        )
        seq += 1

    paths_by_ip = partial.get("paths_by_ip") or {}
    suspicious = []
    for ip, paths in paths_by_ip.items():
        distinct = len(paths or {})
        if distinct >= DISTINCT_PATHS:
            suspicious.append((ip, distinct, sum(int(v) for v in (paths or {}).values())))
    if suspicious:
        suspicious.sort(key=lambda row: (-row[1], row[0]))
        findings.append(
            make_finding(
                finding_id=f"finding-{seq:03d}",
                finding_type="SUSPICIOUS_ACCESS",
                severity="MEDIUM",
                summary="One or more IPs accessed many distinct endpoints.",
                event_count=sum(row[2] for row in suspicious),
                source_ips=[row[0] for row in suspicious[:20]],
                confidence=0.62,
                evidence={
                    "threshold_distinct_paths": DISTINCT_PATHS,
                    "ips": [
                        {"ip": ip, "distinct_paths": d, "requests": c}
                        for ip, d, c in suspicious[:20]
                    ],
                },
            )
        )
        seq += 1

    not_found = partial.get("not_found_by_ip") or {}
    scanners = []
    for ip, n404 in not_found.items():
        distinct_404_paths = len(
            {p for p, c in (paths_by_ip.get(ip) or {}).items() if int(c) > 0}
        )
        if int(n404) >= SCAN_404_COUNT and distinct_404_paths >= SCAN_404_PATHS:
            scanners.append((ip, int(n404), distinct_404_paths))
    if scanners:
        scanners.sort(key=lambda row: (-row[1], row[0]))
        findings.append(
            make_finding(
                finding_id=f"finding-{seq:03d}",
                finding_type="SCANNING_PATTERN",
                severity="MEDIUM",
                summary="Possible scanning activity: many 404 responses across multiple paths.",
                event_count=sum(row[1] for row in scanners),
                source_ips=[row[0] for row in scanners[:20]],
                confidence=0.68,
                evidence={
                    "threshold_404": SCAN_404_COUNT,
                    "threshold_paths": SCAN_404_PATHS,
                    "ips": [
                        {"ip": ip, "count_404": n, "distinct_paths": d}
                        for ip, n, d in scanners[:20]
                    ],
                },
            )
        )
        seq += 1

    sensitive = partial.get("sensitive_path_counts") or {}
    sensitive_total = sum(int(v) for v in sensitive.values())
    if sensitive_total >= SENSITIVE_TOTAL:
        findings.append(
            make_finding(
                finding_id=f"finding-{seq:03d}",
                finding_type="SENSITIVE_PATH_ACCESS",
                severity="HIGH",
                summary="Repeated access to sensitive paths such as /admin, /.env, or /config.",
                event_count=sensitive_total,
                confidence=0.7,
                evidence={
                    "threshold": SENSITIVE_TOTAL,
                    "path_counts": {k: int(v) for k, v in sorted(sensitive.items())},
                },
            )
        )
    return findings
