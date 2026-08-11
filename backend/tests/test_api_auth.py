from __future__ import annotations


def test_register_login_and_protected_route(api_client) -> None:
    register = api_client.post(
        "/api/auth/register",
        json={"email": "user@example.com", "password": "password12"},
    )
    assert register.status_code == 201
    assert register.json()["token_type"] == "bearer"
    assert register.json()["access_token"]

    duplicate = api_client.post(
        "/api/auth/register",
        json={"email": "User@example.com", "password": "password12"},
    )
    assert duplicate.status_code == 409

    bad = api_client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "wrongpass"},
    )
    assert bad.status_code == 401

    login = api_client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "password12"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    denied = api_client.get("/api/datasets")
    assert denied.status_code == 401

    ok = api_client.get("/api/datasets", headers={"Authorization": f"Bearer {token}"})
    assert ok.status_code == 200
    assert ok.json() == []


def test_capabilities_public(api_client) -> None:
    response = api_client.get("/api/system/capabilities")
    assert response.status_code == 200
    body = response.json()
    assert body["execution_backend"] in ("process", "local_process")
    assert "process" in body.get("execution_backends", ["process"])
    assert "application" in body["parsers"]
