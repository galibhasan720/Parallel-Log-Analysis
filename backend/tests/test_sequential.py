from pathlib import Path

from app.hpc.engines.sequential import analyze_file
from app.hpc.engines.statistics import classify_error_pattern
from app.hpc.input_source import FileInputSource

REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE = REPO_ROOT / "data" / "samples" / "synth_small.log"
SYNTH_10MB = Path(r"E:\datasets\log-intelligence\generated\synth_10mb.log")


def test_sequential_totals_match_line_count() -> None:
    line_count = sum(1 for line in SAMPLE.read_text(encoding="utf-8").splitlines() if line.strip())
    result = analyze_file(str(SAMPLE))
    assert result["records_processed"] == line_count
    assert result["valid_records"] + result["invalid_records"] == result["records_processed"]
    assert result["valid_records"] > 0
    assert result["invalid_records"] == 0
    assert result["level_counts"]
    assert result["service_counts"]
    assert "INFO" in result["level_counts"]
    assert "ERROR" in result["level_counts"] or "CRITICAL" in result["level_counts"]
    assert result["error_patterns"]
    assert result["status_counts"]


def test_file_input_source_streams() -> None:
    source = FileInputSource(SAMPLE)
    assert source.size_bytes > 0
    first = next(source.iter_lines())
    assert "INFO" in first or "WARNING" in first or "ERROR" in first


def test_error_pattern_classification() -> None:
    assert classify_error_pattern("Database connection timeout") == "database_timeout"
    assert classify_error_pattern("Failed password") == "authentication_failure"
    assert classify_error_pattern("SQL syntax error") == "sql_syntax"
    assert classify_error_pattern("upstream 502") == "upstream_502"
    assert classify_error_pattern("payment gateway unreachable") == "gateway_unreachable"
    assert classify_error_pattern("auth service crash loop") == "crash_loop"
    assert classify_error_pattern("something else failed") == "other_error"


def test_sequential_10mb_if_present() -> None:
    if not SYNTH_10MB.is_file():
        return
    line_count = 0
    with SYNTH_10MB.open("r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if line.strip():
                line_count += 1
    result = analyze_file(str(SYNTH_10MB))
    assert result["records_processed"] == line_count
    assert result["valid_records"] + result["invalid_records"] == result["records_processed"]
    assert result["valid_records"] > 0
