from pathlib import Path

from app.execution.local_process import LocalProcessBackend
from app.hpc.engines.parallel import analyze_file_parallel
from app.hpc.engines.sequential import analyze_file

REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE = REPO_ROOT / "data" / "samples" / "synth_small.log"
SYNTH_10MB = Path(r"E:\datasets\log-intelligence\generated\synth_10mb.log")

_COMPARE_KEYS = (
    "records_processed",
    "valid_records",
    "invalid_records",
    "level_counts",
    "status_counts",
    "error_patterns",
    "service_counts",
)


def _canonical(partial: dict) -> dict:
    return {key: partial[key] for key in _COMPARE_KEYS}


def test_parallel_matches_sequential_small() -> None:
    sequential = analyze_file(str(SAMPLE))
    for workers in (1, 2, 4):
        parallel = analyze_file_parallel(str(SAMPLE), workers=workers)
        assert _canonical(parallel) == _canonical(sequential), f"mismatch at workers={workers}"


def test_local_process_backend_parallel() -> None:
    backend = LocalProcessBackend()
    seq = backend.execute({"input": str(SAMPLE), "mode": "sequential"})
    par = backend.execute({"input": str(SAMPLE), "mode": "parallel", "workers": 4})
    assert _canonical(par) == _canonical(seq)


def test_parallel_matches_sequential_10mb_if_present() -> None:
    if not SYNTH_10MB.is_file():
        return
    sequential = analyze_file(str(SYNTH_10MB))
    parallel = analyze_file_parallel(str(SYNTH_10MB), workers=4)
    assert _canonical(parallel) == _canonical(sequential)
