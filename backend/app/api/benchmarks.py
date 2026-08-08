"""Benchmark jobs: timed LocalProcessBackend runs persisted as BENCHMARK_RUNS."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import BenchmarkCreateRequest, BenchmarkOut, BenchmarkRowOut, JobCreateOut
from app.auth.deps import get_current_user
from app.core.config import settings
from app.db.models import BenchmarkRun, Dataset, LogJob, User
from app.db.session import get_db
from app.jobs.results import configuration_hash
from app.jobs.runner import enqueue_benchmark

router = APIRouter()


@router.post("", response_model=JobCreateOut, status_code=status.HTTP_201_CREATED)
def create_benchmark(
    body: BenchmarkCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobCreateOut:
    counts = [int(w) for w in body.workers]
    if not counts or any(w < 1 or w > settings.max_workers for w in counts):
        raise HTTPException(status_code=400, detail=f"workers must be 1..{settings.max_workers}")
    if body.runs < 1 or body.runs > 5:
        raise HTTPException(status_code=400, detail="runs must be 1..5")
    dataset = db.get(Dataset, body.dataset_id)
    if dataset is None or dataset.user_id != user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
    fmt = (body.format or dataset.format or "application").lower()
    if fmt == "auto":
        fmt = "application"
    dataset.format = fmt
    max_workers = max(counts)
    mode = "sequential" if max_workers <= 1 else "parallel"
    job = LogJob(
        user_id=user.id,
        dataset_id=dataset.id,
        status="queued",
        processing_mode=mode,
        worker_count=max_workers,
        execution_backend=settings.execution_backend,
        parser_version=settings.parser_version,
        analysis_version=settings.analysis_version,
        configuration_hash=configuration_hash(mode=mode, workers=max_workers, fmt=fmt),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    enqueue_benchmark(job.id, counts, body.runs)
    return JobCreateOut(job_id=job.id, status=job.status)


@router.get("/{job_id}", response_model=BenchmarkOut)
def get_benchmark(
    job_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BenchmarkOut:
    job = db.get(LogJob, job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    runs = db.scalars(
        select(BenchmarkRun).where(BenchmarkRun.job_id == job.id).order_by(BenchmarkRun.id)
    ).all()
    t1 = None
    for row in runs:
        if row.workers == 1:
            t1 = row.elapsed_sec if t1 is None else min(t1, row.elapsed_sec)
    out_rows: list[BenchmarkRowOut] = []
    for row in runs:
        speedup = (t1 / row.elapsed_sec) if t1 and row.elapsed_sec else None
        efficiency = (speedup / row.workers) if speedup else None
        out_rows.append(
            BenchmarkRowOut(
                workers=row.workers,
                mode=row.mode,
                run_number=row.run_number,
                elapsed_sec=row.elapsed_sec,
                throughput_lines_per_sec=row.throughput_lines_per_sec,
                speedup=speedup,
                efficiency=efficiency,
            )
        )
    return BenchmarkOut(job_id=job.id, status=job.status, rows=out_rows)
