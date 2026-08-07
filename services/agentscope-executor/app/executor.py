"""Executor core: maps a bounded `ExecutionEnvelopeV1` to a bounded stream
of `ExecutorCandidateV1` lifecycle events, using an AgentScope `Agent` whose
model is backed solely by the injected gateway.

Ownership boundary (see README.md for the full statement): this module does
NOT validate, resolve, or gate on FactLock/provenance/context-hash fields.
Those fields, if present on the envelope, are only copied verbatim onto the
`start`/`end` events for host-side correlation.
"""
from __future__ import annotations

import asyncio
from typing import AsyncIterator

from agentscope.agent import Agent
from agentscope.event import TextBlockDeltaEvent
from agentscope.message import Msg, TextBlock
from agentscope.tool import Toolkit

from .contracts import (
    DeltaEvent,
    EndEvent,
    ErrorEvent,
    ExecutionEnvelopeV1,
    ExecutorCandidateV1,
    InterruptEvent,
    MAX_EVENT_CONTENT_CHARS,
    StartEvent,
)
from .gateway import ModelGatewayClient
from .model import GatewayBackedChatModel


def build_agent(envelope: ExecutionEnvelopeV1, gateway: ModelGatewayClient) -> Agent:
    """Construct a bare AgentScope `Agent` with no memory/tool/storage
    subsystems initialized:

    - `toolkit=Toolkit()` with no tools/skills/mcps registered -- the
      "basic" tool group it creates internally is empty.
    - `offloader=None` -- no context offload/storage backend.
    - The default `AgentState()` starts with empty `context`, which is
      never persisted anywhere by this service (no DB, no filesystem
      writes).
    """
    model = GatewayBackedChatModel(
        gateway=gateway,
        model_gateway_ref=envelope.model_gateway_ref,
        max_tokens=envelope.max_tokens,
    )
    return Agent(
        name="agentscope-executor-lab",
        system_prompt=(
            "You are a sandboxed lab execution harness. Respond directly "
            "to the user's message."
        ),
        model=model,
        toolkit=Toolkit(),
        offloader=None,
    )


def _build_input_msg(envelope: ExecutionEnvelopeV1) -> Msg:
    if envelope.messages:
        # Only the final user turn is sent as the triggering input; prior
        # turns are not persisted/replayed by this lab service.
        last = envelope.messages[-1]
        return Msg(
            name="user",
            role="user",
            content=[TextBlock(text=last.content)],
        )
    return Msg(
        name="user",
        role="user",
        content=[TextBlock(text=envelope.prompt or "")],
    )


async def run_execution(
    envelope: ExecutionEnvelopeV1,
    gateway: ModelGatewayClient,
) -> AsyncIterator[ExecutorCandidateV1]:
    """Run one execution and yield the bounded lifecycle events:
    start -> delta* -> (end | interrupt | error).

    Enforces `envelope.timeout_seconds`: if the underlying generation does
    not complete in time, yields a terminal `error` event instead of
    hanging. If the surrounding task is cancelled (e.g. the caller aborts
    the request), yields a terminal `interrupt` event.
    """
    yield StartEvent(
        envelope_id=envelope.envelope_id,
        fact_lock_ref=envelope.fact_lock_ref,
        context_hash=envelope.context_hash,
        provenance_ref=envelope.provenance_ref,
    )

    agent = build_agent(envelope, gateway)
    input_msg = _build_input_msg(envelope)

    deltas: list[DeltaEvent] = []
    full_content_parts: list[str] = []
    index = 0

    async def _consume() -> None:
        nonlocal index
        async for evt in agent.reply_stream(input_msg):
            if isinstance(evt, TextBlockDeltaEvent):
                content = evt.delta[:MAX_EVENT_CONTENT_CHARS]
                full_content_parts.append(content)
                deltas.append(
                    DeltaEvent(
                        envelope_id=envelope.envelope_id,
                        content=content,
                        index=index,
                    ),
                )
                index += 1

    # AgentScope's `ChatModelBase.__call__` swallows `asyncio.CancelledError`
    # internally: when the model call task is cancelled, it catches the
    # cancellation and returns a normal `FinishedReason.INTERRUPTED`
    # response instead of re-raising. That means `asyncio.wait_for(task,
    # timeout=...)` will NOT observe a `TimeoutError` here -- cancelling the
    # task at the deadline just makes the model call return early and the
    # task finishes "successfully" (with empty/partial content). We detect
    # that case explicitly below instead of relying on `wait_for` to raise.
    consume_task = asyncio.ensure_future(_consume())
    deadline_hit = False
    try:
        done, _pending = await asyncio.wait(
            [consume_task],
            timeout=envelope.timeout_seconds,
        )
        if consume_task not in done:
            deadline_hit = True
            consume_task.cancel()
            try:
                await consume_task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass
        else:
            # Surface any exception the task raised.
            consume_task.result()
    except asyncio.CancelledError:
        # The caller of `run_execution` (this async generator) was itself
        # cancelled -- propagate that as a terminal interrupt event rather
        # than letting the generator die silently.
        consume_task.cancel()
        yield InterruptEvent(envelope_id=envelope.envelope_id, reason="cancelled")
        return
    except Exception as exc:  # noqa: BLE001 - bounded error mapping by design
        yield ErrorEvent(envelope_id=envelope.envelope_id, message=str(exc))
        return

    if deadline_hit:
        yield ErrorEvent(
            envelope_id=envelope.envelope_id,
            message=f"Execution timed out after {envelope.timeout_seconds}s",
        )
        return

    for delta_event in deltas:
        yield delta_event

    full_content = "".join(full_content_parts)[:MAX_EVENT_CONTENT_CHARS]
    yield EndEvent(
        envelope_id=envelope.envelope_id,
        full_content=full_content,
        fact_lock_ref=envelope.fact_lock_ref,
        context_hash=envelope.context_hash,
        provenance_ref=envelope.provenance_ref,
    )
