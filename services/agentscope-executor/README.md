# agentscope-executor-lab

A strictly optional, lab-only Python service that demonstrates using
[AgentScope](https://github.com/agentscope-ai/agentscope) 2.0.5 purely as a
sandboxed model-execution harness behind a narrow, bounded contract.

## Authority boundary

This service owns **nothing** beyond mapping a bounded
`ExecutionEnvelopeV1` request to AgentScope-driven text generation via an
**injected** model gateway, and emitting bounded lifecycle events
(`start` / `delta` / `end` / `interrupt` / `error`) back out.

It explicitly does **NOT** own, implement, or gate on any of the following
host authorities:

- calculation data or engine logic
- Folio identity or owner authorization
- relationship grants
- context selection or grounding
- memory, long-term state, or conversation persistence
- provider credentials (it never reads provider API keys or constructs a
  provider SDK client itself -- generation is always routed through an
  injected `ModelGatewayClient`)
- tools, MCP servers, or skills (the AgentScope `Toolkit` it constructs is
  always empty)
- databases or filesystem persistence of any kind
- provenance / FactLock validation or repair
- graph scheduling, routing, retries, or promotion decisions

If a request carries FactLock-, provenance-, or context-hash-like fields
(`fact_lock_ref`, `context_hash`, `provenance_ref` on `ExecutionEnvelopeV1`),
this service treats them as **opaque pass-through data only**. They are
never parsed, resolved, validated, or branched on -- they are copied
verbatim onto the `start`/`end` response events purely so a caller can
correlate a response with whatever authority context it holds on the host
side. See `tests/test_executor.py::test_fact_lock_and_context_hash_are_inert_pass_through`
for a test that proves mutating those fields never changes executor
behavior.

## Why this is lab-only / strictly optional

This is an experimental integration surface for evaluating AgentScope as a
potential execution harness. It is:

- **not** wired into any production path of the host system,
- **not** on any request path from the host by default,
- safe to delete entirely without affecting anything else in this
  repository -- nothing outside `services/agentscope-executor/` imports
  from it, and it does not import anything from `packages/orchestration`
  or `src/` in this repository.

## Real AgentScope 2.0.5 API surface actually used

Before writing any code, the installed `agentscope==2.0.5` package was
inspected directly (source under `.venv/lib/python3.11/site-packages/agentscope/`)
rather than guessed. The surface actually used:

- `agentscope.agent.Agent` -- the unified agent class. Constructed with
  `toolkit=Toolkit()` (empty -- no tools/skills/mcps registered) and
  `offloader=None` (no context offload/storage backend), so no
  memory/tool/storage subsystem is active. See `app/executor.py::build_agent`.
- `agentscope.model.ChatModelBase` -- subclassed as `GatewayBackedChatModel`
  in `app/model.py`. Its abstract `_call_api` is the only integration point
  with a provider; this implementation routes every call through the
  injected `ModelGatewayClient` instead of any of AgentScope's built-in
  provider model classes (`AnthropicChatModel`, `OpenAIChatModel`, etc.),
  none of which are imported or used.
- `agentscope.credential.CredentialBase` -- subclassed as
  `LabGatewayCredential`, a placeholder with **no secret fields**, present
  only because `ChatModelBase.__init__` requires a `credential` argument.
  It is never used to make a real API call.
- `agentscope.agent.Agent.reply_stream` / `agentscope.event.TextBlockDeltaEvent`
  -- used to observe streamed text deltas and map them onto the bounded
  `DeltaEvent` contract.
- `agentscope.message.Msg` / `TextBlock` -- used to build the single
  triggering input message per execution (this lab intentionally does not
  replay/persist multi-turn history across calls).
- `agentscope.tool.Toolkit` -- constructed empty; `tests/test_executor.py::test_agent_has_no_tools_registered`
  asserts every tool group's `tools`/`mcps`/`skills_or_loaders` are empty.

### Deviation from the initial design

The initial plan assumed `asyncio.timeout()` around the AgentScope call
would raise on timeout. In practice, `ChatModelBase.__call__` in 2.0.5
catches `asyncio.CancelledError` internally and converts it into a normal
`FinishedReason.INTERRUPTED` `ChatResponse` rather than re-raising, so a
plain `asyncio.timeout()`/`wait_for()` around the streaming loop never
observes a `TimeoutError`. The executor (`app/executor.py::run_execution`)
instead runs the consuming loop as an explicit background task and races
it with `asyncio.wait(..., timeout=...)`, detecting a still-pending task at
the deadline and treating that as the timeout condition itself (mapped to
a terminal `error` event), independent of what AgentScope's internal
cancellation handling does.

## Local run commands

```bash
cd services/agentscope-executor

# install deps (creates .venv, uv.lock)
uv sync

# verify the pinned AgentScope version
uv run python -c "import agentscope; print(agentscope.__version__)"  # -> 2.0.5

# run the HTTP boundary (uses FakeModelGatewayClient by default -- no
# provider credentials are read or required)
uv run uvicorn app.app:app --reload

# run the test suite (deterministic, no network)
uv run pytest -q
```

`POST /v1/execute` accepts `ExecutionEnvelopeV1` JSON and streams
newline-delimited JSON `ExecutorCandidateV1` events
(`start` -> `delta`* -> `end`/`interrupt`/`error`).

## Lint/typecheck

No ruff/mypy configuration was added for this lab service -- it is small
enough that the test suite and manual inspection covered the required
guarantees. `uv add --dev ruff` plus `uv run ruff check .` would be a
reasonable follow-up if this service grows.
