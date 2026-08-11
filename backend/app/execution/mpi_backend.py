"""MPI backend: run analysis under mpirun via subprocess (API / non-MPI parent)."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from app.execution.base import ExecutionBackend
from app.hpc.engines.finalize import finalize_analysis

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class MPIBackend(ExecutionBackend):
    """Launch ``mpirun -np N python -m hpc_engine.analyze --backend mpi ...``.

    When already inside an MPI process (``OMPI_COMM_WORLD_RANK`` set), run in-process.
    """

    def execute(self, job_spec: dict[str, Any]) -> dict[str, Any]:
        path = job_spec.get("input") or job_spec.get("path")
        if not path:
            raise ValueError("job_spec must include 'input' or 'path'")
        workers = max(1, int(job_spec.get("workers", 1)))
        fmt = job_spec.get("format") or job_spec.get("parser")
        parser_name = None if fmt in (None, "auto") else str(fmt)

        if _inside_mpi():
            from app.hpc.engines.mpi_engine import analyze_file_mpi

            partial = analyze_file_mpi(
                str(path),
                workers=workers,
                parser_name=parser_name,
            )
            if partial is None:
                raise RuntimeError("MPI non-root rank should not call MPIBackend.execute")
            return finalize_analysis(partial)

        return finalize_analysis(
            _run_via_mpirun(str(path), workers=workers, parser_name=parser_name)
        )


def _inside_mpi() -> bool:
    return any(
        os.environ.get(k) is not None
        for k in (
            "OMPI_COMM_WORLD_RANK",
            "PMI_RANK",
            "PMIX_RANK",
            "MPI_LOCALRANKID",
        )
    )


def _run_via_mpirun(path: str, *, workers: int, parser_name: str | None) -> dict[str, Any]:
    mpirun = (
        shutil.which("mpirun")
        or shutil.which("mpiexec")
        or _windows_mpiexec()
    )
    if not mpirun:
        raise RuntimeError(
            "mpirun/mpiexec not found. Install Microsoft MPI (Windows) or "
            "OpenMPI in WSL (sudo apt install openmpi-bin libopenmpi-dev) and mpi4py."
        )
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND_ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    cmd = [
        mpirun,
        "-n",
        str(workers),
        sys.executable,
        "-m",
        "hpc_engine.analyze",
        "--backend",
        "mpi",
        "--input",
        path,
        "--workers",
        str(workers),
        "--raw-partial",
    ]
    if parser_name:
        cmd.extend(["--format", parser_name])
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=env,
        cwd=str(BACKEND_ROOT.parent),
        timeout=int(os.environ.get("MPI_JOB_TIMEOUT_SEC", "600")),
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"mpirun failed ({proc.returncode}): {proc.stderr.strip() or proc.stdout.strip()}"
        )
    text = proc.stdout.strip()
    if not text:
        raise RuntimeError("mpirun produced empty stdout")
    # Rank 0 may print warnings on stderr only; stdout should be JSON
    return json.loads(text)


def _windows_mpiexec() -> str | None:
    candidates = [
        Path(os.environ.get("MSMPI_BIN", "")) / "mpiexec.exe",
        Path(r"C:\Program Files\Microsoft MPI\Bin\mpiexec.exe"),
        Path(r"C:\Program Files (x86)\Microsoft MPI\Bin\mpiexec.exe"),
    ]
    for path in candidates:
        if path.is_file():
            return str(path)
    return None
