#!/usr/bin/env python3
"""HPC benchmark harness: worker matrix, backend compare, weak scaling, I/O profiles."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.hpc.engines.dynamic import analyze_file_dynamic
from app.hpc.engines.parallel import analyze_file_parallel
from app.hpc.engines.sequential import analyze_file
from app.hpc.parsers.application import ApplicationParser

REPO_ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = REPO_ROOT / "benchmarks" / "results"


def _parse_workers(text: str) -> list[int]:
    values = []
    for part in text.split(","):
        part = part.strip()
        if not part:
            continue
        n = int(part)
        if n < 1:
            raise ValueError("workers must be >= 1")
        values.append(n)
    if not values:
        raise ValueError("no worker counts provided")
    return values


def _time_call(fn) -> tuple[float, object]:
    start = time.perf_counter()
    result = fn()
    return time.perf_counter() - start, result


def _run_analysis(path: str, workers: int, *, backend: str = "process", chunks_per_worker: int = 8):
    backend = backend.lower()
    if backend == "openmp":
        from app.hpc.engines.openmp_engine import analyze_file_openmp

        return analyze_file_openmp(path, workers=max(1, workers), parser_name="application")
    if backend == "mpi":
        from app.execution.mpi_backend import MPIBackend

        return MPIBackend().execute(
            {"input": path, "workers": max(1, workers), "format": "application"}
        )
    if backend == "dynamic":
        if workers <= 1:
            return analyze_file(path, parser_name="application", worker_id=0)
        return analyze_file_dynamic(
            path,
            workers=workers,
            chunks_per_worker=chunks_per_worker,
            parser_name="application",
        )
    # process
    if workers <= 1:
        return analyze_file(path, parser_name="application", worker_id=0)
    return analyze_file_parallel(path, workers=workers, parser_name="application")


def _profile_read_only(path: str) -> int:
    total = 0
    with open(path, "rb") as fh:
        while True:
            chunk = fh.read(8 * 1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
    return total


def _profile_parse_only(path: str) -> int:
    parser = ApplicationParser()
    valid = 0
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if parser.parse_line(line) is not None:
                valid += 1
    return valid


def run_worker_matrix(
    path: Path,
    worker_counts: list[int],
    *,
    runs: int,
    backend: str = "process",
    chunks_per_worker: int = 8,
) -> list[dict]:
    size_bytes = path.stat().st_size
    rows: list[dict] = []
    t1_mean: float | None = None

    for workers in worker_counts:
        _time_call(
            lambda w=workers: _run_analysis(
                str(path), w, backend=backend, chunks_per_worker=chunks_per_worker
            )
        )
        samples: list[float] = []
        last_result = None
        for _ in range(runs):
            elapsed, last_result = _time_call(
                lambda w=workers: _run_analysis(
                    str(path), w, backend=backend, chunks_per_worker=chunks_per_worker
                )
            )
            samples.append(elapsed)
        mean_s = statistics.mean(samples)
        if workers == 1:
            t1_mean = mean_s
        speedup = (t1_mean / mean_s) if t1_mean and mean_s else None
        efficiency = (speedup / workers) if speedup else None
        lines = int((last_result or {}).get("records_processed") or 0)
        row = {
            "dataset": path.name,
            "size_bytes": size_bytes,
            "backend": backend,
            "workers": workers,
            "mode": "sequential" if workers == 1 else "parallel",
            "runs": samples,
            "mean_s": mean_s,
            "min_s": min(samples),
            "max_s": max(samples),
            "speedup": speedup,
            "efficiency": efficiency,
            "throughput_lines_per_s": (lines / mean_s) if mean_s else None,
            "throughput_mb_per_s": ((size_bytes / (1024 * 1024)) / mean_s) if mean_s else None,
            "records_processed": lines,
        }
        rows.append(row)
        print(
            f"[{backend}] workers={workers:2d}  mean={mean_s:.4f}s  "
            f"speedup={speedup:.3f}  eff={efficiency:.3f}"
            if speedup is not None and efficiency is not None
            else f"[{backend}] workers={workers:2d}  mean={mean_s:.4f}s"
        )
    return rows


def run_io_profiles(path: Path, *, runs: int, workers: int) -> list[dict]:
    profiles = {
        "read-only": lambda: _profile_read_only(str(path)),
        "parse-only": lambda: _profile_parse_only(str(path)),
        "parse+analyze": lambda: _run_analysis(str(path), workers),
    }
    rows = []
    for name, fn in profiles.items():
        _time_call(fn)
        samples = [_time_call(fn)[0] for _ in range(runs)]
        mean_s = statistics.mean(samples)
        rows.append({"profile": name, "workers": workers, "runs": samples, "mean_s": mean_s})
        print(f"profile={name:14s}  mean={mean_s:.4f}s")
    return rows


def run_compare(
    path: Path,
    backends: list[str],
    worker_counts: list[int],
    *,
    runs: int,
) -> dict:
    by_backend = {}
    for backend in backends:
        try:
            by_backend[backend] = run_worker_matrix(
                path, worker_counts, runs=runs, backend=backend
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[{backend}] SKIPPED: {exc}", file=sys.stderr)
            by_backend[backend] = {"error": str(exc)}
    return by_backend


def run_weak_scaling(
    files: list[Path],
    *,
    runs: int,
    backend: str = "process",
) -> list[dict]:
    """Weak scaling: file i paired with workers = i+1 (or workers list matching files)."""
    rows = []
    for idx, path in enumerate(files):
        workers = idx + 1
        if not path.is_file():
            print(f"weak: missing {path}", file=sys.stderr)
            continue
        matrix = run_worker_matrix(path, [workers], runs=runs, backend=backend)
        for row in matrix:
            row["weak_index"] = idx
            rows.append(row)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="HPC benchmark runner")
    parser.add_argument("--file", help="Single file for matrix/io/compare")
    parser.add_argument("--workers", default="1,2,4,6,8,12")
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument(
        "--profile",
        choices=("matrix", "io", "compare", "weak"),
        default="matrix",
    )
    parser.add_argument(
        "--backend",
        default="process",
        help="process|dynamic|mpi|openmp (matrix/io/weak)",
    )
    parser.add_argument(
        "--backends",
        default="process,dynamic,mpi,openmp",
        help="Comma list for --profile compare",
    )
    parser.add_argument("--io-workers", type=int, default=1)
    parser.add_argument("--chunks-per-worker", type=int, default=8)
    parser.add_argument(
        "--weak-files",
        default="",
        help="Comma-separated files for weak scaling (ordered by increasing size)",
    )
    parser.add_argument("--out-dir", default=str(RESULTS_DIR))
    args = parser.parse_args()

    if args.runs < 1:
        print("error: --runs must be >= 1", file=sys.stderr)
        return 2

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    if args.profile == "weak":
        files = [Path(p.strip()) for p in args.weak_files.split(",") if p.strip()]
        if not files:
            print("error: --weak-files required for weak profile", file=sys.stderr)
            return 2
        rows = run_weak_scaling(files, runs=args.runs, backend=args.backend)
        payload = {
            "kind": "weak_scaling",
            "backend": args.backend,
            "rows": rows,
            "measured_at": stamp,
        }
        json_path = out_dir / f"weak_scaling_{args.backend}_{stamp}.json"
        json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"wrote {json_path}")
        return 0

    if not args.file:
        print("error: --file required", file=sys.stderr)
        return 2
    path = Path(args.file)
    if not path.is_file():
        print(f"error: file not found: {path}", file=sys.stderr)
        return 2

    if args.profile == "io":
        rows = run_io_profiles(path, runs=args.runs, workers=args.io_workers)
        payload = {"kind": "io_profile", "file": str(path), "rows": rows, "measured_at": stamp}
        json_path = out_dir / f"io_profile_{path.stem}_{stamp}.json"
    elif args.profile == "compare":
        backends = [b.strip() for b in args.backends.split(",") if b.strip()]
        workers = _parse_workers(args.workers)
        by_backend = run_compare(path, backends, workers, runs=args.runs)
        payload = {
            "kind": "backend_compare",
            "file": str(path),
            "machine": "Intel Core i5-1235U 12 logical processors",
            "backends": by_backend,
            "measured_at": stamp,
        }
        json_path = out_dir / f"backend_compare_{path.stem}_{stamp}.json"
    else:
        workers = _parse_workers(args.workers)
        rows = run_worker_matrix(
            path,
            workers,
            runs=args.runs,
            backend=args.backend,
            chunks_per_worker=args.chunks_per_worker,
        )
        payload = {
            "kind": "worker_matrix",
            "backend": args.backend,
            "file": str(path),
            "machine": "Intel Core i5-1235U 12 logical processors",
            "rows": rows,
            "measured_at": stamp,
        }
        json_path = out_dir / f"experiment_a_{args.backend}_{path.stem}_{stamp}.json"
        csv_path = out_dir / f"experiment_a_{args.backend}_{path.stem}_{stamp}.csv"
        with csv_path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "dataset",
                    "size_bytes",
                    "backend",
                    "workers",
                    "mode",
                    "mean_s",
                    "min_s",
                    "max_s",
                    "speedup",
                    "efficiency",
                    "throughput_lines_per_s",
                    "throughput_mb_per_s",
                    "records_processed",
                ],
            )
            writer.writeheader()
            for row in rows:
                flat = {k: row[k] for k in writer.fieldnames}
                writer.writerow(flat)
        print(f"wrote {csv_path}")

    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"wrote {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
