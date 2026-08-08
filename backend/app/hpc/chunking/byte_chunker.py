"""Equal-size byte ranges for static scheduling."""

from __future__ import annotations

from pathlib import Path


def file_size(path: str | Path) -> int:
    return Path(path).stat().st_size


def byte_ranges(total_bytes: int, workers: int) -> list[tuple[int, int]]:
    """Return N [start, end) byte ranges covering [0, total_bytes)."""
    if workers < 1:
        raise ValueError("workers must be >= 1")
    if total_bytes <= 0:
        return [(0, 0)]
    n = min(workers, total_bytes)
    size = total_bytes // n
    ranges: list[tuple[int, int]] = []
    for i in range(n):
        start = i * size
        end = total_bytes if i == n - 1 else (i + 1) * size
        ranges.append((start, end))
    return ranges
