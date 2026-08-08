#!/usr/bin/env python3
"""Benchmark harness — implement worker matrix on Day 4."""

from __future__ import annotations

import argparse


def main() -> int:
    parser = argparse.ArgumentParser(description="HPC benchmark runner (Day 4+)")
    parser.add_argument("--file", required=True)
    parser.add_argument("--workers", default="1,2,4,6,8,12")
    args = parser.parse_args()
    print(
        "run_benchmarks.py is a Day 1 placeholder.\n"
        f"file={args.file} workers={args.workers}\n"
        "Implement timing + speedup/efficiency on Day 4."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
