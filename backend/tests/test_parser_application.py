from pathlib import Path

from app.hpc.parsers.application import ApplicationParser
from app.hpc.parsers.registry import ParserRegistry

REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE = REPO_ROOT / "data" / "samples" / "synth_small.log"

FIRST_LINE = (
    "2026-08-01T00:00:00.018Z INFO auth-service cache hit "
    "ip=203.0.113.10 PUT /api/login status=404 latency_ms=3687"
)


def test_parse_first_synth_line() -> None:
    event = ApplicationParser().parse_line(FIRST_LINE)
    assert event is not None
    assert event.timestamp.startswith("2026-08-01T00:00:00.018")
    assert event.level == "INFO"
    assert event.service == "auth-service"
    assert "cache hit" in event.message
    assert event.ip_address == "203.0.113.10"
    assert event.http_method == "PUT"
    assert event.http_path == "/api/login"
    assert event.status_code == 404
    assert event.response_time_ms == 3687


def test_parse_error_line_from_sample_file() -> None:
    lines = SAMPLE.read_text(encoding="utf-8").splitlines()
    error_line = next(line for line in lines if " ERROR " in line)
    event = ApplicationParser().parse_line(error_line)
    assert event is not None
    assert event.level == "ERROR"
    assert event.service
    assert event.message


def test_invalid_line_returns_none() -> None:
    assert ApplicationParser().parse_line("not a log line") is None
    assert ApplicationParser().parse_line("") is None


def test_registry_detects_application_format() -> None:
    sample = SAMPLE.read_text(encoding="utf-8").splitlines()[:20]
    registry = ParserRegistry()
    assert registry.detect(sample) == "application"
    parser = registry.parser_for_lines(sample)
    assert parser.name == "application"
