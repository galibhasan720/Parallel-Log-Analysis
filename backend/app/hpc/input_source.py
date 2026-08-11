"""InputSource abstraction. Stage 1: FileInputSource. Stage 2: DirectoryInputSource."""

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


def collect_log_files(directory: str | Path) -> list[Path]:
    root = Path(directory)
    if not root.is_dir():
        raise FileNotFoundError(f"Log directory not found: {root}")
    files = sorted(
        p for p in root.iterdir() if p.is_file() and p.suffix.lower() in {".log", ".txt"}
    )
    if not files:
        raise FileNotFoundError(f"No .log/.txt files in {root}")
    return files


class DirectoryInputSource:
    """Concatenate lines from all .log/.txt files in a directory (sorted by name)."""

    def __init__(self, directory: str | Path) -> None:
        self.directory = Path(directory)
        self.files = collect_log_files(self.directory)

    @property
    def size_bytes(self) -> int:
        return sum(p.stat().st_size for p in self.files)

    def iter_lines(self) -> Iterator[str]:
        for path in self.files:
            with path.open("r", encoding="utf-8", errors="replace", newline="") as fh:
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
