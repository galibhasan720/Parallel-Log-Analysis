from pathlib import Path

from app.hpc.chunking.boundary_alignment import iter_aligned_lines
from app.hpc.chunking.byte_chunker import byte_ranges
from app.hpc.scheduling.static_scheduler import build_chunk_specs

FIXTURE = """alpha line one
bravo line two
charlie line three
delta line four
"""


def test_byte_ranges_cover_file_without_overlap() -> None:
    total = 100
    ranges = byte_ranges(total, 4)
    assert ranges[0][0] == 0
    assert ranges[-1][1] == total
    for i in range(len(ranges) - 1):
        assert ranges[i][1] == ranges[i + 1][0]


def test_aligned_chunks_no_dup_or_missing(tmp_path: Path) -> None:
    path = tmp_path / "tiny.log"
    path.write_bytes(FIXTURE.encode("utf-8"))
    data = path.read_bytes()
    # Split near the middle of "bravo line two"
    mid = data.index(b"bravo") + 3
    assert 0 < mid < len(data)
    left = list(iter_aligned_lines(path, 0, mid))
    right = list(iter_aligned_lines(path, mid, len(data)))
    expected = FIXTURE.splitlines()
    assert left + right == expected
    assert len(set(left) & set(right)) == 0


def test_static_specs_cover_synth_sample() -> None:
    repo = Path(__file__).resolve().parents[2]
    sample = repo / "data" / "samples" / "synth_small.log"
    specs = build_chunk_specs(sample, 4, parser_name="application")
    assert len(specs) == 4
    assert specs[0]["start"] == 0
    assert specs[-1]["end"] == sample.stat().st_size
    reconstructed: list[str] = []
    for spec in specs:
        reconstructed.extend(iter_aligned_lines(spec["path"], spec["start"], spec["end"]))
    full = sample.read_text(encoding="utf-8").splitlines()
    assert reconstructed == full
