"""Aggregate-only Ollama client. Never send raw log lines."""

from __future__ import annotations

import json
import os
from typing import Any

import httpx

PROMPT_CAP = 8 * 1024
DEFAULT_HOST = "http://127.0.0.1:11434"
DEFAULT_MODEL = "llama3.2:3b"


class OllamaUnavailable(Exception):
    """Ollama is down, timed out, or returned an unusable response."""


def build_prompt(
    summary: dict[str, Any] | None,
    errors: dict[str, Any] | None,
    findings: list[Any] | None,
) -> str:
    payload = {
        "summary": summary or {},
        "errors": {
            "error_patterns": (errors or {}).get("error_patterns"),
            "count_5xx": (errors or {}).get("count_5xx"),
        },
        "findings": findings or [],
    }
    blob = json.dumps(payload, indent=2, default=str)
    if len(blob) > PROMPT_CAP:
        blob = blob[:PROMPT_CAP] + "\n...[truncated]"
    return (
        "You are a log intelligence assistant. Using ONLY the JSON evidence below, answer:\n"
        "1. What happened?\n"
        "2. Why might it have happened?\n"
        "3. How serious is it?\n"
        "4. What evidence supports this?\n"
        "5. What should be investigated next?\n\n"
        "Do not claim this is definitely an attack. Do not invent numbers that are not in the JSON. "
        'Prefer wording such as "Potential brute-force activity detected."\n\n'
        "JSON evidence:\n"
        f"{blob}\n"
    )


def generate_summary(prompt: str) -> str:
    host = os.environ.get("OLLAMA_HOST", DEFAULT_HOST).rstrip("/")
    model = os.environ.get("OLLAMA_MODEL", DEFAULT_MODEL)
    try:
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{host}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError, ValueError) as exc:
        raise OllamaUnavailable(str(exc) or exc.__class__.__name__) from exc
    text = str((data or {}).get("response") or "").strip()
    if not text:
        raise OllamaUnavailable("empty model response")
    return text
