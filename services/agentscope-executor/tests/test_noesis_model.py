"""Tests for `NoesisModelGatewayClient` -- the HTTP client that talks to the
host-owned internal model gateway.

Coverage required by Wave B1 Task 9:
 - Python request body has no provider/model/key fields
 - ChatModelBase (`GatewayBackedChatModel`) mapping of request and
   deltas/final response when backed by this client
 - max_retries=0 / no duplicate gateway request after 429/5xx/timeout
 - cancel/timeout propagation -> safe terminal error, no raw disclosure
"""
from __future__ import annotations

import json
import urllib.error

import pytest

from app.contracts import ExecutionEnvelopeV1
from app.executor import build_agent
from app.gateway import GatewayMessage
from app.noesis_model import NoesisGatewayError, NoesisModelGatewayClient


def _client(**overrides) -> NoesisModelGatewayClient:
    defaults = dict(
        gateway_url="http://localhost:9999/internal/model-gateway",
        gateway_token="test-internal-token",
        internal_caller_role="agentscope-executor",
        task_class="fast",
        tier="subscriber",
    )
    defaults.update(overrides)
    return NoesisModelGatewayClient(**defaults)


class _FakeHttpResponse:
    def __init__(self, lines: list[str]) -> None:
        self._body = ("\n".join(lines) + "\n").encode("utf-8")

    def read(self) -> bytes:
        return self._body

    def __enter__(self) -> "_FakeHttpResponse":
        return self

    def __exit__(self, *exc: object) -> None:
        return None


# ---------------------------------------------------------------------------
# Request shape: no provider/model/key fields
# ---------------------------------------------------------------------------


def test_request_body_has_no_provider_model_or_key_fields(monkeypatch):
    captured: dict = {}

    def fake_urlopen(request, timeout=None):  # noqa: ANN001
        captured["headers"] = dict(request.headers)
        captured["body"] = json.loads(request.data.decode("utf-8"))
        return _FakeHttpResponse(['{"type":"end","provider_request_id":"r1","full_content":"hi","provider":"x","model":"y","finish_reason":"stop"}'])

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    client = _client()

    async def _run():
        async for _ in client.generate(
            model_gateway_ref="lab://gw",
            messages=[GatewayMessage(role="user", content="hello")],
            max_tokens=64,
        ):
            pass

    import asyncio

    asyncio.run(_run())

    body = captured["body"]
    for forbidden in ("provider", "model", "api_key", "openai_api_key", "nvidia_api_key", "openrouter_api_key", "model_override"):
        assert forbidden not in body

    assert set(body.keys()) == {
        "internal_caller_role",
        "task_class",
        "tier",
        "messages",
        "max_output_tokens",
    }
    assert body["messages"] == [{"role": "user", "content": "hello"}]
    assert body["max_output_tokens"] == 64

    # The internal token travels only in the Authorization header, never
    # duplicated into the JSON body.
    assert "test-internal-token" not in json.dumps(body)
    assert captured["headers"]["Authorization"] == "Bearer test-internal-token"


# ---------------------------------------------------------------------------
# max_retries=0 / no duplicate request after 429 / 5xx / timeout
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "raise_exc",
    [
        urllib.error.HTTPError(url="u", code=429, msg="rate limited", hdrs=None, fp=None),
        urllib.error.HTTPError(url="u", code=503, msg="server error", hdrs=None, fp=None),
        TimeoutError("timed out"),
    ],
)
def test_no_retry_after_429_5xx_or_timeout(monkeypatch, raise_exc):
    call_count = {"n": 0}

    def fake_urlopen(request, timeout=None):  # noqa: ANN001
        call_count["n"] += 1
        raise raise_exc

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    client = _client()

    async def _run():
        deltas = []
        with pytest.raises(NoesisGatewayError):
            async for delta in client.generate(
                model_gateway_ref="lab://gw",
                messages=[GatewayMessage(role="user", content="hi")],
                max_tokens=32,
            ):
                deltas.append(delta)
        return deltas

    import asyncio

    asyncio.run(_run())

    # Exactly one HTTP call made -- no retry loop in this client, for any
    # of the failure modes above.
    assert call_count["n"] == 1


def test_gateway_error_event_maps_to_noesis_gateway_error(monkeypatch):
    def fake_urlopen(request, timeout=None):  # noqa: ANN001
        return _FakeHttpResponse(
            ['{"type":"error","provider_request_id":"r1","code":"UPSTREAM_UNAVAILABLE","message":"Upstream inference call failed"}']
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    client = _client()

    async def _run():
        async for _ in client.generate(
            model_gateway_ref="lab://gw",
            messages=[GatewayMessage(role="user", content="hi")],
            max_tokens=32,
        ):
            pass

    import asyncio

    with pytest.raises(NoesisGatewayError) as excinfo:
        asyncio.run(_run())

    assert excinfo.value.code == "UPSTREAM_UNAVAILABLE"
    assert "sk-" not in str(excinfo.value)


def test_interrupt_event_maps_to_cancelled_error(monkeypatch):
    def fake_urlopen(request, timeout=None):  # noqa: ANN001
        return _FakeHttpResponse(
            ['{"type":"interrupt","provider_request_id":"r1","reason":"cancelled"}']
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    client = _client()

    async def _run():
        async for _ in client.generate(
            model_gateway_ref="lab://gw",
            messages=[GatewayMessage(role="user", content="hi")],
            max_tokens=32,
        ):
            pass

    import asyncio

    with pytest.raises(NoesisGatewayError) as excinfo:
        asyncio.run(_run())

    assert excinfo.value.code == "CANCELLED"


# ---------------------------------------------------------------------------
# ChatModelBase mapping: request + deltas/final response
# ---------------------------------------------------------------------------


def _envelope(**overrides) -> ExecutionEnvelopeV1:
    defaults = dict(
        envelope_id="e-noesis-1",
        prompt="hello there",
        model_gateway_ref="lab://gateway/noesis",
    )
    defaults.update(overrides)
    return ExecutionEnvelopeV1(**defaults)


@pytest.mark.asyncio
async def test_gateway_backed_chat_model_streams_deltas_from_noesis_client(monkeypatch):
    def fake_urlopen(request, timeout=None):  # noqa: ANN001
        return _FakeHttpResponse(
            [
                '{"type":"start","provider_request_id":"r1"}',
                '{"type":"delta","provider_request_id":"r1","content":"Hel","index":0}',
                '{"type":"delta","provider_request_id":"r1","content":"lo","index":1}',
                '{"type":"end","provider_request_id":"r1","full_content":"Hello","provider":"openrouter","model":"m","finish_reason":"stop"}',
            ]
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    client = _client()
    env = _envelope()
    agent = build_agent(env, client)

    assert agent.model._gateway is client  # noqa: SLF001 - explicit wiring check
    assert agent.model.max_retries == 0

    from agentscope.message import Msg, TextBlock

    input_msg = Msg(name="user", role="user", content=[TextBlock(text="hello")])

    from agentscope.event import TextBlockDeltaEvent

    collected = []
    async for evt in agent.reply_stream(input_msg):
        if isinstance(evt, TextBlockDeltaEvent):
            collected.append(evt.delta)

    assert "".join(collected) == "Hello"
