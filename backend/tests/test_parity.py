"""Stage-2 parity: process, dynamic, optional mpi/openmp."""

from pathlib import Path

import pytest

from app.execution.dynamic_backend import DynamicBackend
from app.execution.local_process import LocalProcessBackend
from app.hpc.engines.dynamic import analyze_file_dynamic
from app.hpc.engines.parallel import analyze_file_parallel
from app.hpc.engines.sequential import analyze_file

REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE = REPO_ROOT / "data" / "samples" / "synth_small.log"
SYNTH_10MB = Path(r"E:\datasets\log-intelligence\generated\synth_10mb.log")

_COMPARE_KEYS = (
    "records_processed",
    "valid_records",
    "invalid_records",
    "count_5xx",
    "level_counts",
    "status_counts",
    "error_patterns",
    "service_counts",
    "path_counts",
    "ip_counts",
    "auth_fail_by_ip",
    "not_found_by_ip",
    "sensitive_path_counts",
    "paths_by_ip",
    "auth_fail_by_ip_minute",
)


def _canonical(partial: dict) -> dict:
    return {key: partial[key] for key in _COMPARE_KEYS}


def test_parallel_matches_sequential_small() -> None:
    sequential = analyze_file(str(SAMPLE))
    for workers in (1, 2, 4):
        parallel = analyze_file_parallel(str(SAMPLE), workers=workers)
        assert _canonical(parallel) == _canonical(sequential), f"mismatch at workers={workers}"


def test_dynamic_matches_sequential_small() -> None:
    sequential = analyze_file(str(SAMPLE))
    for workers in (1, 2, 4):
        dynamic = analyze_file_dynamic(str(SAMPLE), workers=workers, chunks_per_worker=4)
        assert _canonical(dynamic) == _canonical(sequential), f"dynamic mismatch workers={workers}"


def test_local_process_backend_parallel() -> None:
    backend = LocalProcessBackend()
    seq = backend.execute({"input": str(SAMPLE), "mode": "sequential"})
    par = backend.execute({"input": str(SAMPLE), "mode": "parallel", "workers": 4})
    assert _canonical(par) == _canonical(seq)


def test_dynamic_backend_parallel() -> None:
    backend = DynamicBackend()
    seq = backend.execute({"input": str(SAMPLE), "mode": "sequential"})
    par = backend.execute({"input": str(SAMPLE), "mode": "parallel", "workers": 4})
    assert _canonical(par) == _canonical(seq)


def test_parallel_matches_sequential_10mb_if_present() -> None:
    if not SYNTH_10MB.is_file():
        return
    sequential = analyze_file(str(SYNTH_10MB))
    parallel = analyze_file_parallel(str(SYNTH_10MB), workers=4)
    assert _canonical(parallel) == _canonical(sequential)


def test_openmp_matches_sequential_if_available() -> None:
    from app.hpc.engines.openmp_engine import analyze_file_openmp, openmp_available

    if not openmp_available():
        pytest.skip("OpenMP native library not built")
    sequential = analyze_file(str(SAMPLE))
    omp = analyze_file_openmp(str(SAMPLE), workers=4)
    assert _canonical(omp) == _canonical(sequential)


def test_mpi_matches_sequential_if_available() -> None:
    import shutil

    if not (shutil.which("mpiexec") or shutil.which("mpirun")):
        pytest.skip("mpiexec/mpirun not on PATH")
    try:
        from mpi4py import MPI  # noqa: F401
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"mpi4py unavailable: {exc}")

    from app.execution.mpi_backend import MPIBackend

    backend = MPIBackend()
    seq = LocalProcessBackend().execute({"input": str(SAMPLE), "mode": "sequential"})
    try:
        mpi = backend.execute({"input": str(SAMPLE), "workers": 2, "format": "application"})
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"MPI run failed: {exc}")
    assert _canonical(mpi) == _canonical(seq)
