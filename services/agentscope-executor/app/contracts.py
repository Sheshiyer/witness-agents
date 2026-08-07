"""Bounded request/response contracts for the AgentScope executor lab.

These are local, Python-only pydantic models. They intentionally do NOT
import anything from the TS host (packages/orchestration, src/...). Any
FactLock / context-hash-like fields carried in the request are OPAQUE
PASS-THROUGH DATA ONLY: they are never validated, interpreted, or branched
on by this service. They exist purely so a caller can correlate a response
with whatever authority context it holds on the host side.
"""
from __future__ import annotations

from typing import Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Bounded size caps. These are lab defaults, not tuned for production.
# ---------------------------------------------------------------------------
MAX_PROMPT_CHARS = 8_000
MAX_MESSAGE_CONTENT_CHARS = 8_000
MAX_MESSAGES = 50
MAX_EVENT_CONTENT_CHARS = 8_000
MAX_OPAQUE_FIELD_CHARS = 2_000


class ChatMessage(BaseModel):
    """A single bounded chat message.

    Not an AgentScope type — this is the host-facing shape. The executor
    translates it into AgentScope's own `Msg`/`TextBlock` types internally.
    """

    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant", "system"]
    content: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CONTENT_CHARS)


class ExecutionEnvelopeV1(BaseModel):
    """Bounded request shape accepted by the executor's HTTP boundary.

    Fields named ``*_ref`` or ``*_hash`` are opaque strings from the host's
    perspective. The executor never parses, validates, or authorizes
    anything based on their contents — they are only echoed back on
    lifecycle events for correlation purposes.
    """

    model_config = ConfigDict(extra="forbid")

    envelope_id: str = Field(..., min_length=1, max_length=200)

    # Either a single prompt or a list of messages must be provided.
    prompt: Optional[str] = Field(
        default=None,
        max_length=MAX_PROMPT_CHARS,
        description="Single-turn prompt. Mutually usable with `messages`.",
    )
    messages: Optional[list[ChatMessage]] = Field(
        default=None,
        max_length=MAX_MESSAGES,
        description="Multi-turn message history, oldest first.",
    )

    # Opaque reference to a model gateway the executor must call through.
    # This is NEVER a real credential and is never used to construct a
    # provider client directly by this service.
    model_gateway_ref: str = Field(..., min_length=1, max_length=500)

    max_tokens: int = Field(default=512, ge=1, le=8_000)
    timeout_seconds: float = Field(default=30.0, gt=0, le=600.0)

    # Opaque host pass-through fields. NEVER interpreted locally.
    fact_lock_ref: Optional[str] = Field(
        default=None,
        max_length=MAX_OPAQUE_FIELD_CHARS,
        description=(
            "Opaque pass-through only. This executor does not validate, "
            "resolve, or gate on FactLock state."
        ),
    )
    context_hash: Optional[str] = Field(
        default=None,
        max_length=MAX_OPAQUE_FIELD_CHARS,
        description=(
            "Opaque pass-through only. This executor does not interpret "
            "context hashes; it does not select, ground, or validate "
            "context."
        ),
    )
    provenance_ref: Optional[str] = Field(
        default=None,
        max_length=MAX_OPAQUE_FIELD_CHARS,
        description="Opaque pass-through only. No provenance validation happens here.",
    )

    def has_content(self) -> bool:
        return bool(self.prompt) or bool(self.messages)


# ---------------------------------------------------------------------------
# Response / lifecycle events
# ---------------------------------------------------------------------------


class StartEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["start"] = "start"
    envelope_id: str
    fact_lock_ref: Optional[str] = None
    context_hash: Optional[str] = None
    provenance_ref: Optional[str] = None


class DeltaEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["delta"] = "delta"
    envelope_id: str
    content: str = Field(..., max_length=MAX_EVENT_CONTENT_CHARS)
    index: int = Field(..., ge=0)


class EndEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["end"] = "end"
    envelope_id: str
    full_content: str = Field(..., max_length=MAX_EVENT_CONTENT_CHARS)
    fact_lock_ref: Optional[str] = None
    context_hash: Optional[str] = None
    provenance_ref: Optional[str] = None


class InterruptEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["interrupt"] = "interrupt"
    envelope_id: str
    reason: str = Field(default="cancelled", max_length=500)


class ErrorEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["error"] = "error"
    envelope_id: str
    message: str = Field(..., max_length=2_000)


ExecutorCandidateV1 = Union[
    StartEvent,
    DeltaEvent,
    EndEvent,
    InterruptEvent,
    ErrorEvent,
]
"""Discriminated (by `type`) union of the bounded lifecycle events this
executor may emit for a single execution: start -> delta* -> (end |
interrupt | error)."""
