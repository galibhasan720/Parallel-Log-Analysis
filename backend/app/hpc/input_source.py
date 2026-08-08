"""InputSource abstraction. Stage 1: FileInputSource only."""

from __future__ import annotations

from pathlib import Path
from typing import Iterator, Protocol


class InputSource(Protocol):
    def iter_lines(self) -> Iterator[str]: ...


class FileInputSource:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        if not self.path.is_file():
            raise FileNotFoundError(f"Log file not found: {self.path}")

    @property
    def size_bytes(self) -> int:
        return self.path.stat().st_size

    def iter_lines(self) -> Iterator[str]:
        with self.path.open("r", encoding="utf-8", errors="replace", newline="") as fh:
            for line in fh:
                yield line.rstrip("\r\n")

    def sample_lines(self, n: int = 20) -> list[str]:
        lines: list[str] = []
        for line in self.iter_lines():
            if line.strip():
                lines.append(line)
            if len(lines) >= n:
                break
        return lines
