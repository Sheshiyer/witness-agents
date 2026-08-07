import asyncio

import pytest
from pydantic import ValidationError

from app.contracts import (
    DeltaEvent,
    EndEvent,
    ErrorEvent,
    ExecutionEnvelopeV1,
    InterruptEvent,
    MAX_PROMPT_CHARS,
    StartEvent,
)
from app.executor import build_agent, run_execution
from app.gateway import FakeModelGatewayClient, NetworkForbiddenGatewayClient


def _envelope(**overrides) -> ExecutionEnvelopeV1:
    defaults = dict(
        envelope_id="e-1",
        prompt="hello there",
        model_gateway_ref="lab://gateway/default",
    )
    defaults.update(overrides)
    return ExecutionEnvelopeV1(**defaults)


# ---------------------------------------------------------------------------
# No memory/tools/storage initialized
# ---------------------------------------------------------------------------


def test_agent_has_no_tools_registered():
    env = _envelope()
    gateway = FakeModelGatewayClient()
    agent = build_agent(env, gateway)

    for group in agent.toolkit.tool_groups:
        assert group.tools == []
        assert group.mcps == []
        assert group.skills_or_loaders == [] or group.skills_or_loaders is None


def test_agent_has_no_offloader_and_empty_context():
    env = _envelope()
    gateway = FakeModelGatewayClient()
    agent = build_agent(env, gateway)

    assert agent.offloader is None
    assert agent.state.context == []
    assert agent.state.summary == ""


# ---------------------------------------------------------------------------
# No real network/provider call -- only the injected gateway is invoked
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_only_injected_gateway_is_invoked_not_a_real_provider():
    env = _envelope()
    gateway = FakeModelGatewayClient()

    events = [e async for e in run_execution(env, gateway)]

    assert len(gateway.calls) == 1
    assert gateway.calls[0]["model_gateway_ref"] == env.model_gateway_ref
    assert any(isinstance(e, EndEvent) for e in events)


@pytest.mark.asyncio
async def test_network_forbidden_double_would_raise_if_reached():
    env = _envelope()
    gateway = NetworkForbiddenGatewayClient()

    events = [e async for e in run_execution(env, gateway)]

    # The forbidden gateway raises inside generate(); executor maps that to
    # a terminal error event rather than letting a stray network path
    # succeed silently.
    assert isinstance(events[-1], ErrorEvent)
    assert "NetworkForbiddenGatewayClient" in events[-1].message


# ---------------------------------------------------------------------------
# Oversized payload rejected by validation
# ---------------------------------------------------------------------------


def test_oversized_prompt_rejected():
    with pytest.raises(ValidationError):
        _envelope(prompt="x" * (MAX_PROMPT_CHARS + 1))


def test_oversized_opaque_fact_lock_ref_rejected():
    with pytest.raises(ValidationError):
        _envelope(fact_lock_ref="x" * 3000)


# ---------------------------------------------------------------------------
# Full lifecycle matches the schema
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_full_lifecycle_start_delta_end():
    env = _envelope()
    gateway = FakeModelGatewayClient(canned_deltas=["a", "b", "c"])

    events = [e async for e in run_execution(env, gateway)]

    assert isinstance(events[0], StartEvent)
    assert events[0].envelope_id == env.envelope_id

    middle = events[1:-1]
    assert len(middle) == 3
    for i, evt in enumerate(middle):
        assert isinstance(evt, DeltaEvent)
        assert evt.index == i

    assert isinstance(events[-1], EndEvent)
    assert events[-1].full_content == "abc"


# ---------------------------------------------------------------------------
# Cancellation -> terminal interrupt event
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cancellation_produces_interrupt_event():
    env = _envelope(timeout_seconds=5)
    gateway = FakeModelGatewayClient(delay_seconds=1.0)

    collected = []

    async def consume():
        async for evt in run_execution(env, gateway):
            collected.append(evt)

    task = asyncio.ensure_future(consume())
    await asyncio.sleep(0.15)
    task.cancel()

    # `run_execution` catches the cancellation internally to emit a graceful
    # terminal `interrupt` event, so the outer task completes normally
    # rather than propagating `CancelledError` to the caller.
    await task

    assert isinstance(collected[0], StartEvent)
    assert isinstance(collected[-1], InterruptEvent)
    assert collected[-1].reason == "cancelled"


# ---------------------------------------------------------------------------
# Timeout -> terminal error event, not a hang
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_timeout_produces_terminal_error_event():
    env = _envelope(timeout_seconds=0.2)
    gateway = FakeModelGatewayClient(delay_seconds=5.0)

    events = await asyncio.wait_for(
        _collect(run_execution(env, gateway)),
        timeout=2.0,  # test-level safety net; should finish well before this
    )

    assert isinstance(events[0], StartEvent)
    assert isinstance(events[-1], ErrorEvent)
    assert "timed out" in events[-1].message


async def _collect(agen):
    return [e async for e in agen]


# ---------------------------------------------------------------------------
# FactLock/context-hash fields are inert pass-through: mutating them never
# changes execution behavior.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fact_lock_and_context_hash_are_inert_pass_through():
    gateway_a = FakeModelGatewayClient(canned_deltas=["x", "y"])
    gateway_b = FakeModelGatewayClient(canned_deltas=["x", "y"])

    env_a = _envelope(
        fact_lock_ref="fact-lock-AAA",
        context_hash="hash-AAA",
        provenance_ref="prov-AAA",
    )
    env_b = _envelope(
        fact_lock_ref="fact-lock-BBB-totally-different",
        context_hash="hash-BBB-also-different",
        provenance_ref="prov-BBB-also-different",
    )

    events_a = [e async for e in run_execution(env_a, gateway_a)]
    events_b = [e async for e in run_execution(env_b, gateway_b)]

    # Same call count/shape on the gateway regardless of the opaque fields.
    assert len(gateway_a.calls) == len(gateway_b.calls) == 1
    assert gateway_a.calls[0]["model_gateway_ref"] == gateway_b.calls[0]["model_gateway_ref"]
    assert gateway_a.calls[0]["max_tokens"] == gateway_b.calls[0]["max_tokens"]

    # Same event *types* and *counts* -- the opaque fields never change
    # control flow, only get echoed back verbatim on start/end.
    types_a = [type(e) for e in events_a]
    types_b = [type(e) for e in events_b]
    assert types_a == types_b

    assert isinstance(events_a[0], StartEvent)
    assert events_a[0].fact_lock_ref == "fact-lock-AAA"
    assert events_b[0].fact_lock_ref == "fact-lock-BBB-totally-different"

    assert isinstance(events_a[-1], EndEvent)
    assert events_a[-1].full_content == events_b[-1].full_content == "xy"
