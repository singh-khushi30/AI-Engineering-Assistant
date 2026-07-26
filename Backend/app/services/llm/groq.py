"""Groq provider — free-tier OpenAI-compatible API via LiteLLM."""

from __future__ import annotations

from app.core.llm_config import LLMProvider
from app.services.llm.litellm_adapter import LiteLLMProvider


class GroqProvider(LiteLLMProvider):
    """https://console.groq.com — fast free inference."""

    provider = LLMProvider.GROQ
