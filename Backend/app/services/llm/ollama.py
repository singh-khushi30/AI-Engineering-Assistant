"""Ollama provider — local free models via LiteLLM."""

from __future__ import annotations

from app.core.llm_config import LLMProvider
from app.services.llm.litellm_adapter import LiteLLMProvider


class OllamaProvider(LiteLLMProvider):
    """https://ollama.com — local models (no cloud API key required)."""

    provider = LLMProvider.OLLAMA
