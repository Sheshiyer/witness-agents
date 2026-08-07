"""A thin AgentScope `ChatModelBase` implementation that routes every call
through the injected `ModelGatewayClient` -- this is the only place this
service touches the real `agentscope` package's model abstraction.

No AgentScope built-in provider model classes (AnthropicChatModel,
OpenAIChatModel, etc.) are used. No AgentScope `CredentialBase` subclass
that reads a real API key is used either -- `LabGatewayCredential` is a
placeholder credential with no secret material, present only because
`ChatModelBase.__init__` requires a `credential` argument.
"""
from __future__ import annotations

from typing import Any, AsyncGenerator, Literal, Type

from pydantic import BaseModel, Field

from agentscope.credential import CredentialBase
from agentscope.message import Msg, TextBlock
from agentscope.model import ChatModelBase, ChatResponse, FinishedReason
from agentscope.tool import ToolChoice

from .gateway import GatewayMessage, ModelGatewayClient


class LabGatewayCredential(CredentialBase):
    """Placeholder credential carrying NO secret material. It exists only
    to satisfy `ChatModelBase.__init__`'s required `credential` field --
    the real generation call never uses it."""

    type: Literal["lab_gateway_credential"] = "lab_gateway_credential"

    @classmethod
    def get_chat_model_class(cls) -> Type["ChatModelBase"]:
        return GatewayBackedChatModel


class GatewayBackedChatModel(ChatModelBase):
    """Routes all generation through an injected `ModelGatewayClient`.
    Never constructs a provider SDK client and never reads provider API
    keys from the environment."""

    class Parameters(BaseModel):
        max_tokens: int = Field(default=512)

    def __init__(
        self,
        gateway: ModelGatewayClient,
        model_gateway_ref: str,
        max_tokens: int = 512,
    ) -> None:
        super().__init__(
            credential=LabGatewayCredential(),
            model=model_gateway_ref,
            parameters=self.Parameters(max_tokens=max_tokens),
            stream=True,
            max_retries=0,
        )
        self._gateway = gateway
        self._model_gateway_ref = model_gateway_ref
        self._max_tokens = max_tokens

    async def _call_api(
        self,
        model_name: str,
        messages: list[Msg],
        tools: list[dict] | None = None,
        tool_choice: ToolChoice | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[ChatResponse, None]:
        gateway_messages = [
            GatewayMessage(role=msg.role, content=_msg_text(msg))
            for msg in messages
        ]

        async def _stream() -> AsyncGenerator[ChatResponse, None]:
            async for delta in self._gateway.generate(
                model_gateway_ref=self._model_gateway_ref,
                messages=gateway_messages,
                max_tokens=self._max_tokens,
            ):
                yield ChatResponse(
                    content=[TextBlock(text=delta)],
                    is_last=False,
                )

        return _stream()


def _msg_text(msg: Msg) -> str:
    """Extract plain text from an AgentScope `Msg`'s content blocks."""
    parts: list[str] = []
    for block in msg.get_content_blocks():
        text = getattr(block, "text", None)
        if isinstance(text, str):
            parts.append(text)
    return "".join(parts)
