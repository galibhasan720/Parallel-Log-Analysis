"""SQLite schema (Section 11.2). Do not store raw log content."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import JSON


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    datasets: Mapped[list[Dataset]] = relationship(back_populates="user")
    jobs: Mapped[list[LogJob]] = relationship(back_populates="user")


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    filename: Mapped[str] = mapped_column(String(512))
    stored_path: Mapped[str] = mapped_column(String(1024))
    format: Mapped[str] = mapped_column(String(64), default="application")
    size_bytes: Mapped[int] = mapped_column(Integer)
    checksum: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="datasets")
    jobs: Mapped[list[LogJob]] = relationship(back_populates="dataset")


class LogJob(Base):
    __tablename__ = "log_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    processing_mode: Mapped[str] = mapped_column(String(32))
    worker_count: Mapped[int] = mapped_column(Integer, default=1)
    execution_backend: Mapped[str] = mapped_column(String(64), default="local_process")
    schedule: Mapped[str | None] = mapped_column(String(32), nullable=True, default="static")
    chunks_per_worker: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parser_version: Mapped[str] = mapped_column(String(64))
    analysis_version: Mapped[str] = mapped_column(String(64))
    configuration_hash: Mapped[str] = mapped_column(String(64))
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped[User] = relationship(back_populates="jobs")
    dataset: Mapped[Dataset] = relationship(back_populates="jobs")
    result: Mapped[AnalysisResult | None] = relationship(back_populates="job")
    benchmark_runs: Mapped[list[BenchmarkRun]] = relationship(back_populates="job")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("log_jobs.id"), unique=True, index=True)
    summary_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    errors_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    security_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    evidence_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_report: Mapped[str | None] = mapped_column(Text, nullable=True)

    job: Mapped[LogJob] = relationship(back_populates="result")


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("log_jobs.id"), index=True)
    workers: Mapped[int] = mapped_column(Integer)
    mode: Mapped[str] = mapped_column(String(32))
    run_number: Mapped[int] = mapped_column(Integer)
    elapsed_sec: Mapped[float] = mapped_column(Float)
    throughput_lines_per_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    cpu_percent_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    mem_mb_peak: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(512), nullable=True)

    job: Mapped[LogJob] = relationship(back_populates="benchmark_runs")
