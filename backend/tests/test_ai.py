from __future__ import annotations

import time
from pathlib import Path

from app.ai.ollama import OllamaUnavailable, build_prompt

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


def _completed_job(api_client, auth_headers) -> int:
    with SAMPLE_LOG.open("rb") as fh:
        uploaded = api_client.post(
            "/api/datasets",
            headers=auth_headers,
            files={"file": ("synth_small.log", fh, "text/plain")},
        )
    assert uploaded.status_code == 201, uploaded.text
    created = api_client.post(
        "/api/jobs",
        headers=auth_headers,
        json={"dataset_id": uploaded.json()["id"], "mode": "sequential", "workers": 1},
    )
    job = _wait_job(api_client, auth_headers, created.json()["job_id"])
    assert job["status"] == "completed", job
    return job["job_id"]


def test_prompt_is_aggregate_only() -> None:
    prompt = build_prompt(
        {
            "records_processed": 10,
            "top_endpoints": [{"key": "/health", "count": 3}],
        },
        {"error_patterns": {"authentication_failure": 2}, "count_5xx": 1},
        [{"type": "HTTP_5XX_SPIKE", "summary": "HTTP 5xx rate is above the configured baseline."}],
    )
    assert "Do not claim this is definitely an attack" in prompt
    assert "error_patterns" in prompt
    assert "findings" in prompt
    assert "Failed password for invalid user" not in prompt
    assert "paths_by_ip" not in prompt
    assert "auth_fail_by_ip_minute" not in prompt
    assert "/var/log/" not in prompt


def test_ai_summary_success(api_client, auth_headers, monkeypatch) -> None:
    job_id = _completed_job(api_client, auth_headers)

    def fake_generate(prompt: str) -> str:
        assert "error_patterns" in prompt or "findings" in prompt
        assert "INFO auth-service" not in prompt
        return "Potential brute-force activity detected. Investigate auth-service next."

    monkeypatch.setattr("app.api.jobs.generate_summary", fake_generate)
    response = api_client.post(f"/api/jobs/{job_id}/ai-summary", headers=auth_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ollama_available"] is True
    assert "brute-force" in body["ai_report"].lower()
    saved = api_client.get(f"/api/jobs/{job_id}/results", headers=auth_headers)
    assert saved.json()["ai_report"] == body["ai_report"]


def test_ai_summary_ollama_down(api_client, auth_headers, monkeypatch) -> None:
    job_id = _completed_job(api_client, auth_headers)

    def fake_down(_prompt: str) -> str:
        raise OllamaUnavailable("connection refused")

    monkeypatch.setattr("app.api.jobs.generate_summary", fake_down)
    response = api_client.post(f"/api/jobs/{job_id}/ai-summary", headers=auth_headers)
    assert response.status_code == 503, response.text
    body = response.json()
    assert body["ollama_available"] is False
    assert "unavailable" in body["detail"].lower()
