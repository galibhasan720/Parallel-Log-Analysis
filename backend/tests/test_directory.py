"""Directory input source tests."""

from pathlib import Path

from app.hpc.aggregation.reducer import merge_partials
from app.hpc.engines.sequential import analyze_file
from app.hpc.input_source import DirectoryInputSource, collect_log_files

REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE = REPO_ROOT / "data" / "samples" / "synth_small.log"


def test_collect_log_files(tmp_path: Path) -> None:
    a = tmp_path / "a.log"
    b = tmp_path / "b.log"
    a.write_text(SAMPLE.read_text(encoding="utf-8")[:800], encoding="utf-8")
    b.write_text(SAMPLE.read_text(encoding="utf-8")[800:1600], encoding="utf-8")
    files = collect_log_files(tmp_path)
    assert [p.name for p in files] == ["a.log", "b.log"]
    source = DirectoryInputSource(tmp_path)
    lines = list(source.iter_lines())
    assert len(lines) > 0


def test_directory_merge_matches_concat(tmp_path: Path) -> None:
    text = SAMPLE.read_text(encoding="utf-8")
    mid = len(text) // 2
    # split on newline boundary
    cut = text.rfind("\n", 0, mid)
    (tmp_path / "part1.log").write_text(text[: cut + 1], encoding="utf-8")
    (tmp_path / "part2.log").write_text(text[cut + 1 :], encoding="utf-8")
    combined = tmp_path / "combined.log"
    combined.write_text(text, encoding="utf-8")
    p1 = analyze_file(str(tmp_path / "part1.log"))
    p2 = analyze_file(str(tmp_path / "part2.log"))
    merged = merge_partials([p1, p2], worker_id=-1)
    full = analyze_file(str(combined))
    assert merged["records_processed"] == full["records_processed"]
    assert merged["valid_records"] == full["valid_records"]
    assert merged["level_counts"] == full["level_counts"]
