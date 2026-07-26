"""OpenRouter provider — free models only (prefer `:free` model ids)."""

from __future__ import annotations

from app.core.llm_config import LLMProvider
from app.services.llm.litellm_adapter import LiteLLMProvider


class OpenRouterProvider(LiteLLMProvider):
    """https://openrouter.ai — use free models (ids ending in ``:free``)."""

    provider = LLMProvider.OPENROUTER
