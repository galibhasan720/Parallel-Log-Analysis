"""Newline-align a byte range so workers never split a log line."""

from __future__ import annotations

from pathlib import Path
from typing import Iterator


def iter_aligned_lines(path: str | Path, start: int, end: int) -> Iterator[str]:
    """Yield complete lines in [start, end), aligned to newlines.

    If start > 0 and it falls mid-line, discard the incomplete first line.
    If start is already on a line boundary (previous byte is newline), keep it.
    Continue past `end` only to finish the current line.
    """
    with Path(path).open("rb") as fh:
        if start <= 0:
            fh.seek(0)
        else:
            fh.seek(start - 1)
            prev = fh.read(1)
            if prev not in (b"\n", b"\r"):
                fh.readline()
        while True:
            if fh.tell() >= end:
                break
            raw = fh.readline()
            if not raw:
                break
            yield raw.decode("utf-8", errors="replace").rstrip("\r\n")
