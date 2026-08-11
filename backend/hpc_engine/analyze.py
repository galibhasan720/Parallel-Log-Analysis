"""CLI entry for System A. Usage: python -m hpc_engine.analyze ..."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from app.execution.registry import AVAILABLE_BACKENDS, get_backend, normalize_backend_name
from app.hpc.aggregation.reducer import merge_partials
from app.hpc.engines.dynamic import analyze_file_dynamic
from app.hpc.engines.finalize import finalize_analysis
from app.hpc.engines.mpi_engine import analyze_file_mpi
from app.hpc.engines.openmp_engine import analyze_file_openmp
from app.hpc.engines.parallel import analyze_file_parallel
from app.hpc.engines.sequential import analyze_file
from app.hpc.input_source import collect_log_files
from app.hpc.partial import PartialResult


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="HPC log analysis engine (System A)")
    parser.add_argument("--input", help="Path to a single log file")
    parser.add_argument(
        "--input-dir",
        help="Directory of .log/.txt files (merged partials across files)",
    )
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--mode", choices=("sequential", "parallel"), default="sequential")
    parser.add_argument(
        "--backend",
        default="process",
        help=f"Execution backend: {', '.join(AVAILABLE_BACKENDS)} (default: process)",
    )
    parser.add_argument(
        "--schedule",
        choices=("static", "dynamic"),
        default="static",
        help="Process-pool schedule (static equal chunks vs dynamic many chunks)",
    )
    parser.add_argument(
        "--chunks-per-worker",
        type=int,
        default=8,
        help="Dynamic schedule: chunks per worker (default 8)",
    )
    parser.add_argument(
        "--chunk-mb",
        type=float,
        default=None,
        help="Dynamic schedule: target chunk size in MB (approx)",
    )
    parser.add_argument(
        "--format",
        default="auto",
        help="Parser name (default: auto-detect). Stage 1+: application",
    )
    parser.add_argument(
        "--raw-partial",
        action="store_true",
        help="Print pre-finalize partial JSON (used by MPIBackend subprocess)",
    )
    args = parser.parse_args(argv)

    if bool(args.input) == bool(args.input_dir):
        print("error: provide exactly one of --input or --input-dir", file=sys.stderr)
        return 2

    if args.workers < 1:
        print("error: --workers must be >= 1", file=sys.stderr)
        return 2

    try:
        backend_name = normalize_backend_name(args.backend)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    parser_name = None if args.format == "auto" else args.format
    paths = _resolve_paths(args.input, args.input_dir)
    if not paths:
        return 2

    # Already inside mpirun: only rank 0 emits JSON
    if backend_name == "mpi" and _env_has_mpi_rank():
        partials: list[PartialResult] = []
        for path in paths:
            part = analyze_file_mpi(
                str(path),
                workers=args.workers,
                parser_name=parser_name,
            )
            if part is not None:
                partials.append(part)
        if not partials:
            return 0
        merged = partials[0] if len(partials) == 1 else merge_partials(partials, worker_id=-1)
        payload = merged if args.raw_partial else finalize_analysis(merged)
        print(json.dumps(payload, indent=2, sort_keys=True))
        return 0

    # MPI from a non-MPI parent: delegate to MPIBackend (spawns mpirun)
    if backend_name == "mpi":
        backend = get_backend("mpi")
        if len(paths) == 1:
            result = backend.execute(
                {
                    "input": str(paths[0]),
                    "workers": args.workers,
                    "format": parser_name or args.format,
                }
            )
        else:
            file_partials = []
            for path in paths:
                # raw via temporary: execute finalizes; strip by re-analyzing engines is cleaner
                from app.execution.mpi_backend import _run_via_mpirun

                file_partials.append(
                    _run_via_mpirun(
                        str(path),
                        workers=args.workers,
                        parser_name=parser_name,
                    )
                )
            result = finalize_analysis(merge_partials(file_partials, worker_id=-1))
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0

    try:
        partials = [
            _analyze_one(
                str(path),
                backend_name=backend_name,
                mode=args.mode,
                workers=args.workers,
                parser_name=parser_name,
                schedule=args.schedule,
                chunks_per_worker=args.chunks_per_worker,
                chunk_mb=args.chunk_mb,
            )
            for path in paths
        ]
    except Exception as exc:  # noqa: BLE001 — CLI error surface
        print(f"error: {exc}", file=sys.stderr)
        return 1

    merged = partials[0] if len(partials) == 1 else merge_partials(partials, worker_id=-1)
    payload = merged if args.raw_partial else finalize_analysis(merged)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def _analyze_one(
    path: str,
    *,
    backend_name: str,
    mode: str,
    workers: int,
    parser_name: str | None,
    schedule: str,
    chunks_per_worker: int,
    chunk_mb: float | None,
) -> PartialResult:
    if backend_name == "openmp":
        return analyze_file_openmp(path, workers=max(1, workers), parser_name=parser_name)
    if backend_name == "dynamic" or (backend_name == "process" and schedule == "dynamic"):
        factor = chunks_per_worker
        if chunk_mb is not None:
            size = Path(path).stat().st_size
            target = max(1, int(chunk_mb * 1024 * 1024))
            n_chunks = max(workers, (size + target - 1) // target)
            factor = max(1, n_chunks // max(1, workers))
        if mode == "sequential" or workers <= 1:
            return analyze_file(path, parser_name=parser_name, worker_id=0)
        return analyze_file_dynamic(
            path,
            workers=workers,
            chunks_per_worker=factor,
            parser_name=parser_name,
        )
    # process / static
    if mode == "sequential" or workers <= 1:
        if workers != 1 and mode == "sequential":
            print(
                "warning: sequential mode uses a single worker "
                f"(--workers {workers} ignored).",
                file=sys.stderr,
            )
        return analyze_file(path, parser_name=parser_name, worker_id=0)
    return analyze_file_parallel(path, workers=workers, parser_name=parser_name)


def _resolve_paths(input_file: str | None, input_dir: str | None) -> list[Path]:
    if input_file:
        path = Path(input_file)
        if not path.is_file():
            print(f"error: log file not found: {path}", file=sys.stderr)
            return []
        return [path]
    assert input_dir is not None
    try:
        return collect_log_files(input_dir)
    except FileNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return []


def _env_has_mpi_rank() -> bool:
    return any(
        os.environ.get(k) is not None
        for k in ("OMPI_COMM_WORLD_RANK", "PMI_RANK", "PMIX_RANK", "MPI_LOCALRANKID")
    )


if __name__ == "__main__":
    sys.exit(main())
