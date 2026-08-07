import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.contracts import ExecutionEnvelopeV1, MAX_PROMPT_CHARS
from app.app import app


def test_healthz_returns_ok_status_and_no_authority():
    client = TestClient(app)
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "authority": "none"}


def test_http_oversized_payload_rejected_with_422():
    client = TestClient(app)
    resp = client.post(
        "/v1/execute",
        json={
            "envelope_id": "e1",
            "prompt": "x" * (MAX_PROMPT_CHARS + 10),
            "model_gateway_ref": "lab://gw",
        },
    )
    assert resp.status_code == 422


def test_http_valid_payload_streams_ndjson_lifecycle():
    client = TestClient(app)
    with client.stream(
        "POST",
        "/v1/execute",
        json={
            "envelope_id": "e2",
            "prompt": "hi",
            "model_gateway_ref": "lab://gw",
        },
    ) as resp:
        assert resp.status_code == 200
        lines = [line for line in resp.iter_lines() if line]

    assert len(lines) >= 2
    assert '"type":"start"' in lines[0] or '"type": "start"' in lines[0]
    assert '"type":"end"' in lines[-1] or '"type": "end"' in lines[-1]
