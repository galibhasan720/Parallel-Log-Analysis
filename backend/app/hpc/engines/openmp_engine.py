"""OpenMP shared-memory analysis via ctypes → native/openmp_worker."""

from __future__ import annotations

import ctypes
import json
import os
from pathlib import Path

from app.hpc.partial import PartialResult, empty_partial

_REPO_ROOT = Path(__file__).resolve().parents[4]
_NATIVE_DIR = _REPO_ROOT / "native" / "openmp_worker"
_JSON_CAP = 4 * 1024 * 1024

_lib = None
_lib_error: str | None = None


def library_path() -> Path | None:
    env = os.environ.get("OPENMP_WORKER_LIB")
    if env:
        p = Path(env)
        return p if p.is_file() else None
    for name in ("libopenmp_worker.so", "libopenmp_worker.dll", "openmp_worker.dll"):
        candidate = _NATIVE_DIR / name
        if candidate.is_file():
            return candidate
    return None


def openmp_available() -> bool:
    return load_library() is not None


def load_library():
    global _lib, _lib_error
    if _lib is not None:
        return _lib
    path = library_path()
    if path is None:
        _lib_error = (
            f"OpenMP worker library not found under {_NATIVE_DIR}. "
            "Build with: cd native/openmp_worker && make (WSL/Linux) or make dll (MinGW)."
        )
        return None
    try:
        # MinGW OpenMP DLLs (libgomp, libgcc, libwinpthread) must be resolvable.
        mingw_hint = os.environ.get("MINGW_BIN")
        candidates = []
        if mingw_hint:
            candidates.append(Path(mingw_hint))
        candidates.append(path.parent)
        # Common WinGet WinLibs layout
        local = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
        if local.is_dir():
            for pkg in local.glob("BrechtSanders.WinLibs*/mingw64/bin"):
                candidates.append(pkg)
        for directory in candidates:
            if directory.is_dir():
                try:
                    os.add_dll_directory(str(directory))
                except (OSError, AttributeError):
                    os.environ["PATH"] = str(directory) + os.pathsep + os.environ.get("PATH", "")
        lib = ctypes.CDLL(str(path))
        lib.openmp_analyze_file.argtypes = [
            ctypes.c_char_p,
            ctypes.c_int,
            ctypes.c_char_p,
            ctypes.c_int,
        ]
        lib.openmp_analyze_file.restype = ctypes.c_int
        _lib = lib
        _lib_error = None
        return _lib
    except OSError as exc:  # pragma: no cover
        _lib_error = str(exc)
        return None


def analyze_file_openmp(
    path: str,
    *,
    workers: int = 2,
    parser_name: str | None = None,
) -> PartialResult:
    """Analyze with native OpenMP threads. Application Log format only."""
    fmt = (parser_name or "application").strip().lower()
    if fmt not in ("application", "auto", ""):
        raise ValueError(
            f"OpenMP backend supports Application Log format only (got {parser_name!r}). "
            "Use process/dynamic/mpi for other parsers, or convert the dataset."
        )
    lib = load_library()
    if lib is None:
        raise RuntimeError(_lib_error or "OpenMP worker unavailable")
    n = max(1, int(workers))
    buf = ctypes.create_string_buffer(_JSON_CAP)
    written = lib.openmp_analyze_file(path.encode("utf-8"), n, buf, _JSON_CAP)
    if written < 0:
        raise RuntimeError(f"openmp_analyze_file failed with code {written}")
    raw = buf.raw[:written].decode("utf-8")
    data = json.loads(raw)
    # Ensure all PartialResult keys exist for merge/parity
    base = empty_partial(worker_id=-1)
    base.update(data)
    return base


def openmp_library_detail() -> str:
    if openmp_available():
        path = library_path()
        return f"native worker ready · {path}"
    return _lib_error or (
        f"OpenMP worker library not found under {_NATIVE_DIR}. "
        "Build with: cd native/openmp_worker && make (WSL/Linux) or make dll (MinGW on Windows)."
    )
