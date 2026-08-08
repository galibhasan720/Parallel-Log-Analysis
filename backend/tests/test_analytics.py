from pathlib import Path

from app.hpc.engines.analytics import top_n
from app.hpc.engines.finalize import finalize_analysis
from app.hpc.engines.sequential import analyze_lines
from app.hpc.parsers.application import ApplicationParser
from app.hpc.partial import empty_partial
from app.security.heuristics import detect_findings


def test_top_n_order() -> None:
    ranked = top_n({"b": 2, "a": 5, "c": 5}, n=2)
    assert ranked == [{"key": "a", "count": 5}, {"key": "c", "count": 5}]


def test_auth_burst_and_sensitive_path_findings() -> None:
    lines = []
    for i in range(45):
        lines.append(
            f"2026-08-01T00:01:00.{i:03d}Z ERROR auth-service Failed password "
            f"ip=192.0.2.10 POST /api/login status=401 latency_ms=12"
        )
    for i in range(12):
        lines.append(
            f"2026-08-01T00:02:00.{i:03d}Z INFO catalog-api request completed "
            f"ip=192.0.2.11 GET /.env status=200 latency_ms=9"
        )
    partial = analyze_lines(lines, ApplicationParser(), worker_id=0)
    findings = detect_findings(partial)
    types = {item["type"] for item in findings}
    assert "AUTHENTICATION_FAILURE_SPIKE" in types
    assert "SENSITIVE_PATH_ACCESS" in types
    auth = next(item for item in findings if item["type"] == "AUTHENTICATION_FAILURE_SPIKE")
    assert auth["summary"] == "Potential brute-force activity detected."
    assert "definitely" not in auth["summary"].lower()


def test_heuristics_from_tiny_counters() -> None:
    partial = empty_partial()
    partial["valid_records"] = 100
    partial["count_5xx"] = 20
    partial["auth_fail_by_ip"] = {"203.0.113.8": 41}
    partial["auth_fail_by_ip_minute"] = {"203.0.113.8": {"2026-08-01T00:00": 16}}
    partial["paths_by_ip"] = {
        "203.0.113.9": {f"/p{i}": 1 for i in range(6)},
        "203.0.113.10": {f"/scan/{i}": 5 for i in range(5)},
    }
    partial["not_found_by_ip"] = {"203.0.113.10": 25}
    partial["sensitive_path_counts"] = {"/admin": 10}
    types = {item["type"] for item in detect_findings(partial)}
    assert types == {
        "AUTHENTICATION_FAILURE_SPIKE",
        "HTTP_5XX_SPIKE",
        "SUSPICIOUS_ACCESS",
        "SCANNING_PATTERN",
        "SENSITIVE_PATH_ACCESS",
    }


def test_heuristics_below_threshold() -> None:
    partial = empty_partial()
    partial["valid_records"] = 100
    partial["count_5xx"] = 10
    partial["auth_fail_by_ip"] = {"203.0.113.8": 10}
    assert detect_findings(partial) == []


def test_finalize_adds_topn_and_findings() -> None:
    repo = Path(__file__).resolve().parents[2]
    sample = repo / "data" / "samples" / "synth_small.log"
    from app.hpc.engines.sequential import analyze_file

    finalized = finalize_analysis(analyze_file(str(sample)))
    assert finalized["top_endpoints"]
    assert finalized["top_ips"]
    assert finalized["top_services"]
    assert finalized["top_status_codes"]
    assert isinstance(finalized["findings"], list)
