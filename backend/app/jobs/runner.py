"""Local job runner. FastAPI starts it; HPC stays behind ExecutionBackend."""

from __future__ import annotations

import queue
import threading
import time
from typing import Any

from app.db.models import AnalysisResult, BenchmarkRun, Dataset, LogJob, utcnow
from app.db.session import get_session_factory
from app.execution.registry import get_backend
from app.jobs.results import split_finalize

# ("analysis", job_id) or ("benchmark", job_id, worker_counts, runs)
_job_queue: queue.Queue[Any] = queue.Queue()
_cancel_ids: set[int] = set()
_cancel_lock = threading.Lock()
_worker_lock = threading.Lock()
_worker_started = False


def reset_worker_state() -> None:
    """Test helper: clear cancel flags. Does not kill the daemon worker."""
    with _cancel_lock:
        _cancel_ids.clear()
    while True:
        try:
            _job_queue.get_nowait()
        except queue.Empty:
            break


def ensure_worker() -> None:
    global _worker_started
    with _worker_lock:
        if _worker_started:
            return
        thread = threading.Thread(target=_worker_loop, name="hpc-job-runner", daemon=True)
        thread.start()
        _worker_started = True


def enqueue_analysis(job_id: int) -> None:
    ensure_worker()
    _job_queue.put(("analysis", job_id))


def enqueue_benchmark(job_id: int, worker_counts: list[int], runs: int) -> None:
    ensure_worker()
    _job_queue.put(("benchmark", job_id, list(worker_counts), int(runs)))


def request_cancel(job_id: int) -> None:
    with _cancel_lock:
        _cancel_ids.add(job_id)


def is_cancelled(job_id: int) -> bool:
    with _cancel_lock:
        return job_id in _cancel_ids


def _worker_loop() -> None:
    while True:
        item = _job_queue.get()
        kind = item[0]
        job_id = item[1]
        try:
            if is_cancelled(job_id):
                _fail_job(job_id, "cancelled")
                continue
            if kind == "analysis":
                _run_analysis(job_id)
            elif kind == "benchmark":
                _run_benchmark(job_id, item[2], item[3])
        except Exception as exc:  # noqa: BLE001 — persist failure, keep worker alive
            _fail_job(job_id, str(exc))


def _session():
    return get_session_factory()()


def _fail_job(job_id: int, message: str) -> None:
    db = _session()
    try:
        job = db.get(LogJob, job_id)
        if job is None or job.status in ("completed", "failed"):
            return
        job.status = "failed"
        job.error_message = message[:2000]
        job.completed_at = utcnow()
        db.commit()
    finally:
        db.close()


def _default_chunks() -> int:
    import os

    return int(os.environ.get("CHUNKS_PER_WORKER", "8"))


def _run_analysis(job_id: int) -> None:
    db = _session()
    try:
        job = db.get(LogJob, job_id)
        if job is None:
            return
        dataset = db.get(Dataset, job.dataset_id)
        if dataset is None:
            job.status = "failed"
            job.error_message = "dataset missing"
            job.completed_at = utcnow()
            db.commit()
            return
        stored_path = dataset.stored_path
        mode = job.processing_mode
        workers = job.worker_count
        fmt = dataset.format
        backend_name = job.execution_backend or "process"
        schedule = job.schedule or "static"
        chunks = job.chunks_per_worker if job.chunks_per_worker is not None else _default_chunks()
        job.status = "running"
        db.commit()
    finally:
        db.close()

    if is_cancelled(job_id):
        _fail_job(job_id, "cancelled")
        return

    spec: dict[str, Any] = {
        "input": stored_path,
        "mode": mode,
        "workers": workers,
        "format": fmt,
        "schedule": schedule,
        "chunks_per_worker": chunks,
    }
    backend = get_backend(backend_name)
    result = backend.execute(spec)

    db = _session()
    try:
        job = db.get(LogJob, job_id)
        if job is None:
            return
        if is_cancelled(job_id):
            job.status = "failed"
            job.error_message = "cancelled"
            job.completed_at = utcnow()
            db.commit()
            return
        job.status = "aggregating"
        db.commit()
        summary, errors, security, evidence = split_finalize(result)
        db.add(
            AnalysisResult(
                job_id=job_id,
                summary_json=summary,
                errors_json=errors,
                security_json=security,
                evidence_json=evidence,
                ai_report=None,
            )
        )
        job.status = "completed"
        job.completed_at = utcnow()
        db.commit()
    finally:
        db.close()


def _run_benchmark(job_id: int, worker_counts: list[int], runs: int) -> None:
    db = _session()
    try:
        job = db.get(LogJob, job_id)
        if job is None:
            return
        dataset = db.get(Dataset, job.dataset_id)
        if dataset is None:
            job.status = "failed"
            job.error_message = "dataset missing"
            job.completed_at = utcnow()
            db.commit()
            return
        stored_path = dataset.stored_path
        fmt = dataset.format
        backend_name = job.execution_backend or "process"
        schedule = job.schedule or "static"
        chunks = job.chunks_per_worker if job.chunks_per_worker is not None else _default_chunks()
        job.status = "running"
        db.commit()
    finally:
        db.close()

    backend = get_backend(backend_name)
    for workers in worker_counts:
        if is_cancelled(job_id):
            _fail_job(job_id, "cancelled")
            return
        mode = "sequential" if workers <= 1 else "parallel"
        for run_number in range(1, runs + 1):
            start = time.perf_counter()
            result = backend.execute(
                {
                    "input": stored_path,
                    "mode": mode,
                    "workers": max(workers, 1),
                    "format": fmt,
                    "schedule": schedule,
                    "chunks_per_worker": chunks,
                }
            )
            elapsed = time.perf_counter() - start
            lines = int((result or {}).get("records_processed") or 0)
            throughput = (lines / elapsed) if elapsed else None
            db = _session()
            try:
                db.add(
                    BenchmarkRun(
                        job_id=job_id,
                        workers=workers,
                        mode=mode,
                        run_number=run_number,
                        elapsed_sec=elapsed,
                        throughput_lines_per_sec=throughput,
                        cpu_percent_avg=None,
                        mem_mb_peak=None,
                        notes=backend_name,
                    )
                )
                db.commit()
            finally:
                db.close()

    db = _session()
    try:
        job = db.get(LogJob, job_id)
        if job is None:
            return
        job.status = "aggregating"
        db.commit()
        job.status = "completed"
        job.completed_at = utcnow()
        db.commit()
    finally:
        db.close()
