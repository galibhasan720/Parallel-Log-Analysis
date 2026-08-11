"""SQLAlchemy engine / session. SQLite check_same_thread=False for the job worker."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.models import Base

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def reset_engine() -> None:
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None


def get_engine() -> Engine:
    global _engine, _SessionLocal
    if _engine is None:
        settings.db_path.parent.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(
            settings.database_url,
            connect_args={"check_same_thread": False},
        )
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal


def init_db() -> None:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    engine = get_engine()
    Base.metadata.create_all(engine)
    _ensure_log_job_columns(engine)


def _ensure_log_job_columns(engine: Engine) -> None:
    """SQLite-friendly add of Stage-2 columns without a full migration framework."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "log_jobs" not in insp.get_table_names():
        return
    existing = {col["name"] for col in insp.get_columns("log_jobs")}
    statements: list[str] = []
    if "schedule" not in existing:
        statements.append("ALTER TABLE log_jobs ADD COLUMN schedule VARCHAR(32)")
    if "chunks_per_worker" not in existing:
        statements.append("ALTER TABLE log_jobs ADD COLUMN chunks_per_worker INTEGER")
    if not statements:
        return
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


def get_db() -> Generator[Session, None, None]:
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
