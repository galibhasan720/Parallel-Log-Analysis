"""Resolve Stage-2 execution backends by name."""

from __future__ import annotations

from typing import Any

from app.execution.base import ExecutionBackend
from app.execution.local_process import LocalProcessBackend
from app.execution.mpi_backend import MPIBackend
from app.execution.openmp_backend import OpenMPBackend
from app.execution.dynamic_backend import DynamicBackend

BACKEND_ALIASES = {
    "process": "process",
    "local_process": "process",
    "mpi": "mpi",
    "openmp": "openmp",
    "dynamic": "dynamic",
}

AVAILABLE_BACKENDS = ("process", "mpi", "openmp", "dynamic")


def normalize_backend_name(name: str | None) -> str:
    key = (name or "process").strip().lower()
    if key not in BACKEND_ALIASES:
        raise ValueError(
            f"Unknown execution backend {name!r}. "
            f"Choose one of: {', '.join(AVAILABLE_BACKENDS)}"
        )
    return BACKEND_ALIASES[key]


def get_backend(name: str | None = None) -> ExecutionBackend:
    key = normalize_backend_name(name)
    if key == "process":
        return LocalProcessBackend()
    if key == "mpi":
        return MPIBackend()
    if key == "openmp":
        return OpenMPBackend()
    if key == "dynamic":
        return DynamicBackend()
    raise ValueError(f"Unknown backend {key}")


def backend_status() -> dict[str, Any]:
    """Capability probes for /api/system/capabilities."""
    mpi_ok = False
    mpi_detail = "mpi4py / MPI runtime not ready"
    try:
        from mpi4py import MPI  # noqa: F401

        mpi_ok = True
        import shutil

        from app.execution.mpi_backend import _windows_mpiexec

        launcher = shutil.which("mpirun") or shutil.which("mpiexec") or _windows_mpiexec()
        if launcher:
            mpi_detail = f"mpi4py importable · launcher {launcher}"
        else:
            mpi_ok = False
            mpi_detail = (
                "mpi4py is importable but mpirun/mpiexec was not found. "
                "Install Microsoft MPI (Windows) or OpenMPI in WSL, then retry."
            )
    except Exception as exc:  # noqa: BLE001 — DLL / ABI failures
        mpi_detail = (
            f"mpi4py not usable: {exc}. "
            "Install mpi4py against MS-MPI or OpenMPI matching this Python."
        )

    from app.hpc.engines.openmp_engine import openmp_available, openmp_library_detail

    omp_ok = openmp_available()
    return {
        "process": {"available": True, "detail": "ProcessPoolExecutor · static byte chunks"},
        "dynamic": {
            "available": True,
            "detail": "ProcessPoolExecutor · queue-fed small chunks (chunks_per_worker)",
        },
        "mpi": {"available": mpi_ok, "detail": mpi_detail},
        "openmp": {
            "available": omp_ok,
            "detail": openmp_library_detail()
            + (" · Application Log format only" if omp_ok else ""),
        },
    }
