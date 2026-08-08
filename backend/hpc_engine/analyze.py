"""CLI entry for System A. Usage: python -m hpc_engine.analyze ..."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.hpc.engines.sequential import analyze_file


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="HPC log analysis engine (System A)")
    parser.add_argument("--input", required=True, help="Path to log file")
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--mode", choices=("sequential", "parallel"), default="sequential")
    parser.add_argument(
        "--format",
        default="auto",
        help="Parser name (default: auto-detect). Day 2: application",
    )
    args = parser.parse_args(argv)

    path = Path(args.input)
    if not path.is_file():
        print(f"error: log file not found: {path}", file=sys.stderr)
        return 2

    if args.mode == "parallel":
        print(
            "error: --mode parallel is Day 3. Use --mode sequential for the baseline.",
            file=sys.stderr,
        )
        return 2

    if args.workers != 1:
        print(
            "warning: sequential mode ignores --workers other than 1 "
            f"(got {args.workers}); Day 3 will use ProcessPool.",
            file=sys.stderr,
        )

    parser_name = None if args.format == "auto" else args.format
    result = analyze_file(str(path), parser_name=parser_name, worker_id=0)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
