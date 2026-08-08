"""CLI entry for System A. Usage: python -m hpc_engine.analyze ..."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.hpc.engines.parallel import analyze_file_parallel
from app.hpc.engines.sequential import analyze_file


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="HPC log analysis engine (System A)")
    parser.add_argument("--input", required=True, help="Path to log file")
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--mode", choices=("sequential", "parallel"), default="sequential")
    parser.add_argument(
        "--format",
        default="auto",
        help="Parser name (default: auto-detect). Stage 1: application",
    )
    args = parser.parse_args(argv)

    path = Path(args.input)
    if not path.is_file():
        print(f"error: log file not found: {path}", file=sys.stderr)
        return 2

    if args.workers < 1:
        print("error: --workers must be >= 1", file=sys.stderr)
        return 2

    parser_name = None if args.format == "auto" else args.format

    if args.mode == "sequential":
        if args.workers != 1:
            print(
                "warning: sequential mode uses a single worker "
                f"(--workers {args.workers} ignored).",
                file=sys.stderr,
            )
        result = analyze_file(str(path), parser_name=parser_name, worker_id=0)
    else:
        result = analyze_file_parallel(
            str(path),
            workers=args.workers,
            parser_name=parser_name,
        )

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
