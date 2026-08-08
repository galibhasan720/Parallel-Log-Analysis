from __future__ import annotations

from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE_LOG = REPO_ROOT / "data" / "samples" / "synth_small.log"


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    from app.core.config import settings
    from app.db.session import init_db, reset_engine
    from app.jobs import runner as job_runner

    settings.db_path = tmp_path / "test.db"
    settings.upload_dir = tmp_path / "uploads"
    settings.upload_dir.mkdir()
    settings.jwt_secret = "test-secret-please-use-at-least-32b"
    reset_engine()
    job_runner.reset_worker_state()
    init_db()

    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        yield client
    reset_engine()


@pytest.fixture
def auth_headers(api_client):
    payload = {"email": "tester@example.com", "password": "password12"}
    created = api_client.post("/api/auth/register", json=payload)
    assert created.status_code == 201, created.text
    token = created.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
