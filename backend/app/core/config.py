"""Runtime settings. JWT_SECRET must be overridden outside local dev."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent


@dataclass
class Settings:
    db_path: Path = field(default_factory=lambda: BACKEND_ROOT / "data" / "app.db")
    upload_dir: Path = field(default_factory=lambda: BACKEND_ROOT / "data" / "uploads")
    jwt_secret: str = field(
        default_factory=lambda: os.environ.get("JWT_SECRET", "dev-only-change-me")
    )
    jwt_expire_min: int = field(
        default_factory=lambda: int(os.environ.get("JWT_EXPIRE_MIN", "120"))
    )
    max_upload_bytes: int = 120 * 1024 * 1024
    max_workers: int = 12
    max_concurrent_jobs: int = 1
    execution_backend: str = field(
        default_factory=lambda: os.environ.get("EXECUTION_BACKEND", "process")
    )
    parser_version: str = "application-1.0"
    analysis_version: str = "finalize-1.0"
    allowed_extensions: tuple[str, ...] = (".log", ".txt")

    @property
    def database_url(self) -> str:
        return "sqlite:///" + self.db_path.resolve().as_posix()


settings = Settings()
