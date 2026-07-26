"""Provider contract for LLM completions (Clean Architecture port)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field

from app.core.llm_config import LLMConfig, LLMProvider


class ProviderResult(BaseModel):
    """Normalized completion payload returned by every provider."""

    content: str
    model: str
    provider: str
    usage: dict[str, Any] | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class BaseLLMProvider(ABC):
    """Strategy interface — one implementation per vendor."""

    provider: LLMProvider

    def __init__(self, config: LLMConfig) -> None:
        self.config = config

    @abstractmethod
    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ProviderResult:
        """Execute a chat completion. Raise LLMServiceError subclasses on failure."""
