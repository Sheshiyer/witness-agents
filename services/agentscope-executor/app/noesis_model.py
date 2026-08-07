"""`NoesisModelGatewayClient` -- a `ModelGatewayClient` implementation that
routes generation to the host-owned internal model gateway
(`src/api/internal-model-gateway.ts`) over plain HTTP.

This is the ONLY piece of this lab service that knows the internal gateway's
URL/token. It never receives, stores, or forwards a real provider API key,
and it never chooses a provider or model -- `model_gateway_ref` is an opaque
string the host resolves into role/tier/provider/model on its own side.

Retry ownership: this client sets no retry loop of its own. Exactly one HTTP
request is made to the gateway per `generate()` call, regardless of the
response (429, 5xx, timeout, or success) -- `ChatModelBase.__init__` in
`app/model.py`'s `GatewayBackedChatModel` already sets `max_retries=0` for
the AgentScope side; this client independently never retries either, so the
"one retry owner" invariant holds even if this client is used outside that
class. Any provider-level fallback/retry policy that exists lives entirely
on the host side of the gateway HTTP boundary, not here.

Uses only the Python standard library (`urllib.request` off the event loop
via `asyncio.to_thread`) so this module introduces no new dependency.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import AsyncIterator, Sequence

from .gateway import GatewayMessage, ModelGatewayClient


class NoesisGatewayError(Exception):
    """Raised when the internal gateway returns a terminal error event or
    the HTTP call itself fails. Carries only a safe code/message -- never
    raw response bodies, headers, or the internal token."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass
class NoesisModelGatewayClient(ModelGatewayClient):
    """Talks to the host's internal model gateway HTTP route.

    Constructor accepts ONLY the gateway URL/token plus bounded metadata
    (`internal_caller_role`, `task_class`, `tier`) -- no provider keys, no
    provider/model choice. `model_gateway_ref` passed to `generate()` is
    carried through as opaque metadata only; this client does not
    interpret it.
    """

    gateway_url: str
    gateway_token: str
    internal_caller_role: str = "agentscope-executor"
    task_class: str = "fast"
    tier: str = "subscriber"
    request_timeout_seconds: float = 30.0

    async def generate(
        self,
        *,
        model_gateway_ref: str,
        messages: Sequence[GatewayMessage],
        max_tokens: int,
    ) -> AsyncIterator[str]:
        import asyncio

        body = {
            "internal_caller_role": self.internal_caller_role,
            "task_class": self.task_class,
            "tier": self.tier,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "max_output_tokens": max_tokens,
        }

        # Exactly one request. No retry on any outcome (429/5xx/timeout
        # included) -- that policy, if any, lives entirely on the host
        # side of the gateway HTTP boundary.
        lines = await asyncio.to_thread(self._post_once, body)

        for line in lines:
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue

            event_type = event.get("type")
            if event_type == "delta":
                content = event.get("content", "")
                if content:
                    yield content
            elif event_type == "error":
                raise NoesisGatewayError(
                    event.get("code", "UPSTREAM_UNAVAILABLE"),
                    event.get("message", "Internal model gateway error"),
                )
            elif event_type == "interrupt":
                raise NoesisGatewayError("CANCELLED", event.get("reason", "cancelled"))
            # "start" / "end" carry no additional deltas to yield.

    def _post_once(self, body: dict) -> list[str]:
        """Single synchronous HTTP POST -- no retry loop. Raises
        `NoesisGatewayError` on any transport failure, never surfacing the
        raw underlying exception (which could embed response bodies)."""
        payload = json.dumps(body).encode("utf-8")
        request = urllib.request.Request(
            self.gateway_url,
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.gateway_token}",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.request_timeout_seconds) as resp:
                raw = resp.read().decode("utf-8")
        except urllib.error.HTTPError:
            raise NoesisGatewayError("UPSTREAM_UNAVAILABLE", "Internal model gateway returned an HTTP error")
        except urllib.error.URLError:
            raise NoesisGatewayError("UPSTREAM_UNAVAILABLE", "Internal model gateway unreachable")
        except TimeoutError:
            raise NoesisGatewayError("TIMEOUT", "Internal model gateway request timed out")

        return raw.splitlines()
