"""Model gateway abstraction.

The executor never constructs its own provider client and never reads
provider API keys from the environment. All generation is routed through an
injected `ModelGatewayClient`. Production wiring (real credentials, real
provider SDKs) is entirely the host's responsibility and lives outside this
lab service.
"""
from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator, Sequence


@dataclass
class GatewayMessage:
    """A minimal role/content pair passed to the gateway. Not an AgentScope
    type -- kept independent so the gateway interface has no AgentScope
    dependency."""

    role: str
    content: str


class ModelGatewayClient(ABC):
    """Abstract injected gateway. Implementations are supplied by the host;
    this service never picks or authenticates a provider itself."""

    @abstractmethod
    async def generate(
        self,
        *,
        model_gateway_ref: str,
        messages: Sequence[GatewayMessage],
        max_tokens: int,
    ) -> AsyncIterator[str]:
        """Yield text deltas for a single generation. Implementations may
        raise `asyncio.CancelledError` on cancellation and any `Exception`
        on failure; the executor maps both to bounded lifecycle events."""
        raise NotImplementedError
        yield ""  # pragma: no cover - abstract generator shape marker


@dataclass
class FakeModelGatewayClient(ModelGatewayClient):
    """Deterministic test double. Returns canned deltas with no network
    access whatsoever. Used exclusively by the test suite (and safe as a
    local dev default) -- it never talks to a real provider."""

    canned_deltas: Sequence[str] = field(
        default_factory=lambda: ["Hello", ", ", "world", "."],
    )
    delay_seconds: float = 0.0
    calls: list[dict] = field(default_factory=list)
    raise_error: Exception | None = None

    async def generate(
        self,
        *,
        model_gateway_ref: str,
        messages: Sequence[GatewayMessage],
        max_tokens: int,
    ) -> AsyncIterator[str]:
        self.calls.append(
            {
                "model_gateway_ref": model_gateway_ref,
                "messages": list(messages),
                "max_tokens": max_tokens,
            },
        )
        if self.raise_error is not None:
            raise self.raise_error

        for delta in self.canned_deltas:
            if self.delay_seconds:
                await asyncio.sleep(self.delay_seconds)
            yield delta


class NetworkForbiddenGatewayClient(ModelGatewayClient):
    """Test double that raises if it is ever invoked. Used to prove that no
    generation path bypasses the injected gateway to reach a real
    network/provider call."""

    async def generate(
        self,
        *,
        model_gateway_ref: str,
        messages: Sequence[GatewayMessage],
        max_tokens: int,
    ) -> AsyncIterator[str]:
        raise AssertionError(
            "NetworkForbiddenGatewayClient.generate() was called -- a real "
            "or unexpected network/provider path was reached instead of "
            "the injected FakeModelGatewayClient.",
        )
        yield ""  # pragma: no cover
