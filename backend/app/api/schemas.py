"""Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DatasetOut(BaseModel):
    id: int
    filename: str
    format: str
    size_bytes: int
    checksum: str
    created_at: datetime


class JobCreateRequest(BaseModel):
    dataset_id: int
    mode: str = "sequential"
    workers: int = 1
    format: str | None = None
    execution_backend: str | None = None
    schedule: str | None = None
    chunks_per_worker: int | None = None


class JobStatusOut(BaseModel):
    job_id: int
    status: str
    dataset_id: int | None = None
    processing_mode: str | None = None
    worker_count: int | None = None
    execution_backend: str | None = None
    schedule: str | None = None
    chunks_per_worker: int | None = None
    parser_version: str | None = None
    analysis_version: str | None = None
    configuration_hash: str | None = None
    error_message: str | None = None
    created_at: datetime | None = None
    completed_at: datetime | None = None


class JobCreateOut(BaseModel):
    job_id: int
    status: str


class AnalysisResultOut(BaseModel):
    job_id: int
    status: str
    summary: dict
    errors: dict
    security: dict
    evidence: dict
    ai_report: str | None = None
    execution_backend: str
    schedule: str | None = None
    chunks_per_worker: int | None = None
    parser_version: str
    analysis_version: str
    configuration_hash: str


class BenchmarkCreateRequest(BaseModel):
    dataset_id: int
    workers: list[int] = Field(default_factory=lambda: [1, 2, 4])
    runs: int = 1
    format: str | None = None
    execution_backend: str | None = None
    schedule: str | None = None
    chunks_per_worker: int | None = None


class BenchmarkRowOut(BaseModel):
    workers: int
    mode: str
    run_number: int
    elapsed_sec: float
    throughput_lines_per_sec: float | None = None
    speedup: float | None = None
    efficiency: float | None = None


class BenchmarkOut(BaseModel):
    job_id: int
    status: str
    rows: list[BenchmarkRowOut]


class CapabilitiesOut(BaseModel):
    execution_backend: str
    execution_backends: list[str]
    backend_status: dict
    max_workers: int
    max_upload_bytes: int
    parsers: list[str]
    modes: list[str]
    schedules: list[str]
    parser_version: str
    analysis_version: str


class AiSummaryOut(BaseModel):
    ai_report: str | None = None
    ollama_available: bool
    detail: str | None = None
