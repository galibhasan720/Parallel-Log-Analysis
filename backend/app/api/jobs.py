"""Analysis jobs: create, poll, cancel, results. HPC via LocalProcessBackend only."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas import (
    AnalysisResultOut,
    JobCreateOut,
    JobCreateRequest,
    JobStatusOut,
)
from app.auth.deps import get_current_user
from app.core.config import settings
from app.db.models import Dataset, LogJob, User
from app.db.session import get_db
from app.jobs.results import configuration_hash
from app.jobs.runner import enqueue_analysis, request_cancel

router = APIRouter()


def _job_out(job: LogJob) -> JobStatusOut:
    return JobStatusOut(
        job_id=job.id,
        status=job.status,
        dataset_id=job.dataset_id,
        processing_mode=job.processing_mode,
        worker_count=job.worker_count,
        execution_backend=job.execution_backend,
        parser_version=job.parser_version,
        analysis_version=job.analysis_version,
        configuration_hash=job.configuration_hash,
        error_message=job.error_message,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


@router.post("", response_model=JobCreateOut, status_code=status.HTTP_201_CREATED)
def create_job(
    body: JobCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobCreateOut:
    mode = body.mode.lower().strip()
    if mode not in ("sequential", "parallel"):
        raise HTTPException(status_code=400, detail="mode must be sequential or parallel")
    workers = int(body.workers)
    if workers < 1 or workers > settings.max_workers:
        raise HTTPException(status_code=400, detail=f"workers must be 1..{settings.max_workers}")
    if mode == "sequential":
        workers = 1
    dataset = db.get(Dataset, body.dataset_id)
    if dataset is None or dataset.user_id != user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
    fmt = (body.format or dataset.format or "application").lower()
    if fmt == "auto":
        fmt = "application"
    dataset.format = fmt
    job = LogJob(
        user_id=user.id,
        dataset_id=dataset.id,
        status="queued",
        processing_mode=mode,
        worker_count=workers,
        execution_backend=settings.execution_backend,
        parser_version=settings.parser_version,
        analysis_version=settings.analysis_version,
        configuration_hash=configuration_hash(mode=mode, workers=workers, fmt=fmt),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    enqueue_analysis(job.id)
    return JobCreateOut(job_id=job.id, status=job.status)


@router.get("/{job_id}", response_model=JobStatusOut)
def get_job(
    job_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobStatusOut:
    job = db.get(LogJob, job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_out(job)


@router.post("/{job_id}/cancel", response_model=JobStatusOut)
def cancel_job(
    job_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobStatusOut:
    job = db.get(LogJob, job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "queued":
        raise HTTPException(status_code=409, detail="Only queued jobs can be cancelled")
    request_cancel(job.id)
    job.status = "failed"
    job.error_message = "cancelled"
    db.commit()
    db.refresh(job)
    return _job_out(job)


@router.get("/{job_id}/results", response_model=AnalysisResultOut)
def get_results(
    job_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalysisResultOut:
    job = db.get(LogJob, job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed" or job.result is None:
        raise HTTPException(status_code=404, detail="Results not ready")
    result = job.result
    return AnalysisResultOut(
        job_id=job.id,
        status=job.status,
        summary=result.summary_json or {},
        errors=result.errors_json or {},
        security=result.security_json or {},
        evidence=result.evidence_json or {},
        ai_report=result.ai_report,
        execution_backend=job.execution_backend,
        parser_version=job.parser_version,
        analysis_version=job.analysis_version,
        configuration_hash=job.configuration_hash,
    )


@router.post("/{job_id}/ai-summary", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def ai_summary(
    job_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    job = db.get(LogJob, job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"detail": "AI summary is Day 6 (Ollama)."}
