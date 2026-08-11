"""Scheduler unit tests."""

from pathlib import Path

from app.hpc.scheduling.dynamic_scheduler import build_dynamic_chunk_specs
from app.hpc.scheduling.static_scheduler import build_chunk_specs

REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE = REPO_ROOT / "data" / "samples" / "synth_small.log"


def test_static_chunk_count() -> None:
    specs = build_chunk_specs(SAMPLE, 4)
    assert len(specs) == 4
    assert specs[0]["start"] == 0
    assert specs[-1]["end"] == SAMPLE.stat().st_size


def test_dynamic_more_chunks_than_workers() -> None:
    specs = build_dynamic_chunk_specs(SAMPLE, workers=2, chunks_per_worker=4)
    assert len(specs) == 8
