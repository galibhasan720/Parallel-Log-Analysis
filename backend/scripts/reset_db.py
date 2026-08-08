#!/usr/bin/env python3
"""Drop and recreate backend/data/app.db for demos. Does not delete uploaded files."""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.core.config import settings
from app.db.models import Base
from app.db.session import get_engine, reset_engine


def main() -> int:
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    reset_engine()
    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    print(f"reset {settings.db_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
