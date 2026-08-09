#!/usr/bin/env python3
"""Generate synthetic application logs for Stage 1 scaling tests.

Usage:
  python backend/scripts/generate_synthetic_logs.py --out-dir E:\\datasets\\log-intelligence\\generated
"""

from __future__ import annotations

import argparse
import hashlib
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

LEVELS = ("INFO", "WARNING", "ERROR", "CRITICAL")
LEVEL_WEIGHTS = (0.72, 0.15, 0.11, 0.02)
SERVICES = ("auth-service", "booking-service", "payment-service", "catalog-api")
METHODS = ("GET", "POST", "PUT", "DELETE")
PATHS = (
    "/api/login",
    "/api/bookings",
    "/api/payments",
    "/api/catalog",
    "/admin",
    "/.env",
    "/health",
)
MESSAGES = {
    "INFO": ("request completed", "cache hit", "heartbeat ok"),
    "WARNING": ("slow query", "retry scheduled", "rate limit approaching"),
    "ERROR": (
        "Database connection timeout",
        "Failed password",
        "SQL syntax error",
        "upstream 502",
    ),
    "CRITICAL": ("payment gateway unreachable", "auth service crash loop"),
}
IPS = [f"192.0.2.{i}" for i in range(1, 40)] + [f"203.0.113.{i}" for i in range(1, 20)]
STATUSES = (200, 200, 200, 201, 400, 401, 403, 404, 500, 502)


def fake_line(rng: random.Random, ts: datetime) -> str:
    level = rng.choices(LEVELS, weights=LEVEL_WEIGHTS, k=1)[0]
    service = rng.choice(SERVICES)
    method = rng.choice(METHODS)
    path = rng.choice(PATHS)
    status = rng.choice(STATUSES)
    ip = rng.choice(IPS)
    latency = rng.randint(5, 4200)
    msg = rng.choice(MESSAGES[level])
    ts_s = ts.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    return (
        f"{ts_s} {level} {service} {msg} ip={ip} {method} {path} "
        f"status={status} latency_ms={latency}\n"
    )


def write_file(path: Path, target_bytes: int, seed: int) -> dict:
    rng = random.Random(seed)
    ts = datetime(2026, 8, 1, tzinfo=timezone.utc)
    path.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    lines = 0
    with path.open("w", encoding="utf-8", newline="\n") as fh:
        while written < target_bytes:
            ts += timedelta(milliseconds=rng.randint(1, 80))
            line = fake_line(rng, ts)
            fh.write(line)
            written += len(line.encode("utf-8"))
            lines += 1
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    size = path.stat().st_size
    return {"path": str(path), "size_bytes": size, "lines": lines, "sha256": digest}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out-dir",
        default=r"E:\datasets\log-intelligence\generated",
        help="Directory for large generated logs",
    )
    parser.add_argument(
        "--sample-dir",
        default=str(Path(__file__).resolve().parents[2] / "data" / "samples"),
        help="Tiny sample committed to git (<2 MB)",
    )
    parser.add_argument(
        "--also-500mb",
        action="store_true",
        help="Generate only synth_500mb.log (does not regenerate small/10/100).",
    )
    args = parser.parse_args()
    out_dir = Path(args.out_dir)
    sample_dir = Path(args.sample_dir)

    if args.also_500mb:
        specs = [(out_dir / "synth_500mb.log", 500 * 1024 * 1024, 500)]
    else:
        specs = [
            (sample_dir / "synth_small.log", 256 * 1024, 1),
            (out_dir / "synth_10mb.log", 10 * 1024 * 1024, 10),
            (out_dir / "synth_100mb.log", 100 * 1024 * 1024, 100),
        ]
    results = [write_file(path, size, seed) for path, size, seed in specs]
    for row in results:
        print(
            f"{row['path']}\n  size={row['size_bytes']} lines={row['lines']} sha256={row['sha256']}"
        )
    manifest = out_dir / "MANIFEST.txt"
    if args.also_500mb and manifest.is_file():
        existing = manifest.read_text(encoding="utf-8")
        with manifest.open("a", encoding="utf-8") as fh:
            for row in results:
                line = (
                    f"{os.path.basename(row['path'])}\t{row['size_bytes']}\t"
                    f"{row['lines']}\t{row['sha256']}\n"
                )
                if os.path.basename(row["path"]) not in existing:
                    fh.write(line)
    else:
        with manifest.open("w", encoding="utf-8") as fh:
            for row in results:
                fh.write(
                    f"{os.path.basename(row['path'])}\t{row['size_bytes']}\t"
                    f"{row['lines']}\t{row['sha256']}\n"
                )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
