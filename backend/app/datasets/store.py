"""Save uploaded logs to disk. Jobs use dataset_id → stored_path, never client paths."""

from __future__ import annotations

import hashlib
import re
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings

_UNSAFE = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(name: str) -> str:
    base = Path(name or "upload.log").name
    cleaned = _UNSAFE.sub("_", base).strip("._") or "upload.log"
    return cleaned[:180]


def extension_ok(name: str) -> bool:
    return Path(name).suffix.lower() in settings.allowed_extensions


async def save_upload(upload: UploadFile) -> tuple[Path, str, int, str]:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    original = sanitize_filename(upload.filename or "upload.log")
    dest = settings.upload_dir / f"{uuid.uuid4().hex}_{original}"
    digest = hashlib.sha256()
    size = 0
    with dest.open("wb") as fh:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > settings.max_upload_bytes:
                dest.unlink(missing_ok=True)
                raise ValueError("file too large")
            digest.update(chunk)
            fh.write(chunk)
    return dest, original, size, digest.hexdigest()
