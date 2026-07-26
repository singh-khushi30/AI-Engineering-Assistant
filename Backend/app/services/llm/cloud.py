"""Future-friendly stubs for paid/cloud providers (minimal LiteLLM wrappers)."""

from __future__ import annotations

from app.core.llm_config import LLMProvider
from app.services.llm.litellm_adapter import LiteLLMProvider


class OpenAIProvider(LiteLLMProvider):
    provider = LLMProvider.OPENAI


class AnthropicProvider(LiteLLMProvider):
    provider = LLMProvider.ANTHROPIC


class AzureOpenAIProvider(LiteLLMProvider):
    provider = LLMProvider.AZURE_OPENAI
