"""Thin FastAPI boundary for the AgentScope executor lab.

Exposes a single POST endpoint that accepts an `ExecutionEnvelopeV1` and
streams back `ExecutorCandidateV1` lifecycle events as newline-delimited
JSON (NDJSON). This is intentionally minimal -- no auth, no persistence, no
routing/orchestration logic. It exists to let a caller exercise the
executor over HTTP in a lab setting.

The default model gateway used when running this app directly is the
`FakeModelGatewayClient` -- there is no wiring anywhere in this module that
reads provider API keys or constructs a real provider SDK client. A real
deployment would inject a real `ModelGatewayClient` implementation owned
entirely by the host, outside this service.
"""
from __future__ import annotations

import json
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from .contracts import ExecutionEnvelopeV1
from .executor import run_execution
from .gateway import FakeModelGatewayClient, ModelGatewayClient

app = FastAPI(
    title="agentscope-executor-lab",
    description=(
        "Lab-only, strictly optional sandboxed model-execution harness. "
        "See README.md for the authority boundary."
    ),
)

# Lab-default gateway. Swap via `app.dependency_overrides` or by importing
# `run_execution` directly with a different gateway in another process --
# this module never reads provider credentials itself.
_default_gateway: ModelGatewayClient = FakeModelGatewayClient()


def get_gateway() -> ModelGatewayClient:
    return _default_gateway


@app.post("/v1/execute")
async def execute(envelope: ExecutionEnvelopeV1) -> StreamingResponse:
    gateway = get_gateway()

    async def _ndjson() -> AsyncIterator[bytes]:
        async for event in run_execution(envelope, gateway):
            line = event.model_dump_json() if hasattr(event, "model_dump_json") else json.dumps(event)
            yield (line + "\n").encode("utf-8")

    return StreamingResponse(_ndjson(), media_type="application/x-ndjson")


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok", "authority": "none"}
