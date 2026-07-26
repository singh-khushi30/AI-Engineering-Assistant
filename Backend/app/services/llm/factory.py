"""Provider factory — single registration point for all LLM backends."""

from __future__ import annotations

import logging
from collections.abc import Callable

from app.core.llm_config import LLMConfig, LLMProvider
from app.services.llm.base import BaseLLMProvider
from app.services.llm.cloud import AnthropicProvider, AzureOpenAIProvider, OpenAIProvider
from app.services.llm.gemini import GeminiProvider
from app.services.llm.groq import GroqProvider
from app.services.llm.ollama import OllamaProvider
from app.services.llm.openrouter import OpenRouterProvider

logger = logging.getLogger(__name__)

ProviderBuilder = Callable[[LLMConfig], BaseLLMProvider]


class ProviderFactory:
    """Create provider strategies. Register new vendors here only."""

    _registry: dict[LLMProvider, ProviderBuilder] = {
        LLMProvider.GEMINI: GeminiProvider,
        LLMProvider.GROQ: GroqProvider,
        LLMProvider.OLLAMA: OllamaProvider,
        LLMProvider.OPENROUTER: OpenRouterProvider,
        LLMProvider.OPENAI: OpenAIProvider,
        LLMProvider.ANTHROPIC: AnthropicProvider,
        LLMProvider.AZURE_OPENAI: AzureOpenAIProvider,
    }

    @classmethod
    def register(cls, provider: LLMProvider, builder: ProviderBuilder) -> None:
        """Extension hook for future providers without editing call sites."""
        cls._registry[provider] = builder
        logger.info("Registered LLM provider=%s", provider.value)

    @classmethod
    def supported_providers(cls) -> list[str]:
        return [provider.value for provider in cls._registry]

    @classmethod
    def create(cls, provider: LLMProvider, config: LLMConfig) -> BaseLLMProvider:
        builder = cls._registry.get(provider)
        if builder is None:
            supported = ", ".join(cls.supported_providers())
            raise ValueError(
                f"Unsupported LLM provider '{provider.value}'. Supported: {supported}"
            )
        active = config.for_provider(provider)
        instance = builder(active)
        logger.debug(
            "Created provider=%s model=%s",
            provider.value,
            active.resolved_model_for(provider),
        )
        return instance
