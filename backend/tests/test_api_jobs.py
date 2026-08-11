from __future__ import annotations

import time
from pathlib import Path

SAMPLE_LOG = Path(__file__).resolve().parents[2] / "data" / "samples" / "synth_small.log"


def _wait_job(client, headers, job_id: int, timeout: float = 60.0) -> dict:
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        response = client.get(f"/api/jobs/{job_id}", headers=headers)
        assert response.status_code == 200, response.text
        last = response.json()
        if last["status"] in ("completed", "failed"):
            return last
        time.sleep(0.1)
    raise TimeoutError(f"job {job_id} stuck at {last}")


def test_upload_job_results_and_reproducibility(api_client, auth_headers) -> None:
    with SAMPLE_LOG.open("rb") as fh:
        uploaded = api_client.post(
            "/api/datasets",
            headers=auth_headers,
            files={"file": ("synth_small.log", fh, "text/plain")},
        )
    assert uploaded.status_code == 201, uploaded.text
    dataset = uploaded.json()
    assert dataset["filename"] == "synth_small.log"
    assert dataset["checksum"]
    assert dataset["size_bytes"] > 0
    assert "stored_path" not in dataset

    listed = api_client.get("/api/datasets", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    created = api_client.post(
        "/api/jobs",
        headers=auth_headers,
        json={"dataset_id": dataset["id"], "mode": "sequential", "workers": 1},
    )
    assert created.status_code == 201, created.text
    job_id = created.json()["job_id"]
    assert created.json()["status"] == "queued"

    job = _wait_job(api_client, auth_headers, job_id)
    assert job["status"] == "completed", job
    assert job["execution_backend"] in ("process", "local_process", "dynamic", "mpi", "openmp")
    assert job["parser_version"]
    assert job["analysis_version"]
    assert len(job["configuration_hash"]) == 64

    results = api_client.get(f"/api/jobs/{job_id}/results", headers=auth_headers)
    assert results.status_code == 200, results.text
    body = results.json()
    assert body["summary"]["top_endpoints"]
    assert body["summary"]["top_ips"]
    assert "findings" in body["security"]
    assert body["errors"]["error_patterns"] is not None
    assert body["configuration_hash"] == job["configuration_hash"]

    cancel_done = api_client.post(f"/api/jobs/{job_id}/cancel", headers=auth_headers)
    assert cancel_done.status_code == 409

    listed = api_client.get("/api/jobs", headers=auth_headers)
    assert listed.status_code == 200
    assert any(item["job_id"] == job_id for item in listed.json())


def test_parallel_job_matches_flow(api_client, auth_headers) -> None:
    with SAMPLE_LOG.open("rb") as fh:
        uploaded = api_client.post(
            "/api/datasets",
            headers=auth_headers,
            files={"file": ("synth_small.log", fh, "text/plain")},
        )
    dataset_id = uploaded.json()["id"]
    created = api_client.post(
        "/api/jobs",
        headers=auth_headers,
        json={"dataset_id": dataset_id, "mode": "parallel", "workers": 2},
    )
    job = _wait_job(api_client, auth_headers, created.json()["job_id"])
    assert job["status"] == "completed", job
    assert job["worker_count"] == 2
    results = api_client.get(f"/api/jobs/{job['job_id']}/results", headers=auth_headers)
    assert results.status_code == 200
    assert results.json()["summary"]["records_processed"] > 0


def test_benchmark_small_sample(api_client, auth_headers) -> None:
    with SAMPLE_LOG.open("rb") as fh:
        uploaded = api_client.post(
            "/api/datasets",
            headers=auth_headers,
            files={"file": ("synth_small.log", fh, "text/plain")},
        )
    dataset_id = uploaded.json()["id"]
    created = api_client.post(
        "/api/benchmarks",
        headers=auth_headers,
        json={"dataset_id": dataset_id, "workers": [1, 2], "runs": 1},
    )
    assert created.status_code == 201, created.text
    job_id = created.json()["job_id"]
    job = _wait_job(api_client, auth_headers, job_id)
    assert job["status"] == "completed", job
    bench = api_client.get(f"/api/benchmarks/{job_id}", headers=auth_headers)
    assert bench.status_code == 200, bench.text
    rows = bench.json()["rows"]
    assert len(rows) == 2
    assert rows[0]["workers"] == 1
    assert rows[0]["speedup"] == 1.0 or abs(rows[0]["speedup"] - 1.0) < 1e-9
    assert rows[1]["workers"] == 2
    assert rows[1]["speedup"] is not None


def test_hpc_cli_still_importable() -> None:
    from hpc_engine.analyze import main

    assert callable(main)


def test_reject_non_log_upload(api_client, auth_headers) -> None:
    response = api_client.post(
        "/api/datasets",
        headers=auth_headers,
        files={"file": ("notes.exe", b"not a log", "application/octet-stream")},
    )
    assert response.status_code == 400


def test_dynamic_job_persists_chunks(api_client, auth_headers) -> None:
    with SAMPLE_LOG.open("rb") as fh:
        uploaded = api_client.post(
            "/api/datasets",
            headers=auth_headers,
            files={"file": ("synth_small.log", fh, "text/plain")},
        )
    dataset_id = uploaded.json()["id"]
    created = api_client.post(
        "/api/jobs",
        headers=auth_headers,
        json={
            "dataset_id": dataset_id,
            "mode": "parallel",
            "workers": 2,
            "execution_backend": "dynamic",
            "chunks_per_worker": 4,
        },
    )
    assert created.status_code == 201, created.text
    job_id = created.json()["job_id"]
    job = _wait_job(api_client, auth_headers, job_id)
    assert job["status"] == "completed", job
    assert job["execution_backend"] == "dynamic"
    assert job["chunks_per_worker"] == 4
    results = api_client.get(f"/api/jobs/{job_id}/results", headers=auth_headers)
    assert results.status_code == 200
    body = results.json()
    assert body["execution_backend"] == "dynamic"
    assert body["chunks_per_worker"] == 4
    assert body["summary"]["records_processed"] > 0


def test_benchmark_process_backend_selector(api_client, auth_headers) -> None:
    with SAMPLE_LOG.open("rb") as fh:
        uploaded = api_client.post(
            "/api/datasets",
            headers=auth_headers,
            files={"file": ("synth_small.log", fh, "text/plain")},
        )
    dataset_id = uploaded.json()["id"]
    created = api_client.post(
        "/api/benchmarks",
        headers=auth_headers,
        json={
            "dataset_id": dataset_id,
            "workers": [1, 2],
            "runs": 1,
            "execution_backend": "process",
        },
    )
    assert created.status_code == 201, created.text
    job_id = created.json()["job_id"]
    job = _wait_job(api_client, auth_headers, job_id)
    assert job["status"] == "completed", job
    assert job["execution_backend"] in ("process", "local_process")
    bench = api_client.get(f"/api/benchmarks/{job_id}", headers=auth_headers)
    assert bench.status_code == 200
    assert len(bench.json()["rows"]) == 2


def test_benchmark_rejects_unavailable_backend(api_client, auth_headers, monkeypatch) -> None:
    from app.api import benchmarks as benchmarks_api
    from app.execution import registry

    real_status = registry.backend_status

    def fake_status():
        status = real_status()
        status["openmp"] = {"available": False, "detail": "forced unavailable for test"}
        return status

    monkeypatch.setattr(benchmarks_api, "backend_status", fake_status)
    with SAMPLE_LOG.open("rb") as fh:
        uploaded = api_client.post(
            "/api/datasets",
            headers=auth_headers,
            files={"file": ("synth_small.log", fh, "text/plain")},
        )
    dataset_id = uploaded.json()["id"]
    created = api_client.post(
        "/api/benchmarks",
        headers=auth_headers,
        json={
            "dataset_id": dataset_id,
            "workers": [1],
            "runs": 1,
            "execution_backend": "openmp",
        },
    )
    assert created.status_code == 400
    assert "unavailable" in created.json()["detail"].lower()
