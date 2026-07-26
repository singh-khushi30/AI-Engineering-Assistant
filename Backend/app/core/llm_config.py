"""Provider-agnostic LLM configuration derived from application settings.

Architectural note:
  Business code depends on ``LLMConfig`` / ``ProviderFactory`` / ``LLMService``,
  never on a specific vendor SDK. Switching providers is an env change
  (``LLM_PROVIDER`` / ``PRIMARY_PROVIDER`` / ``FALLBACK_PROVIDERS`` + keys).
"""

from __future__ import annotations

from enum import Enum
from functools import lru_cache
from typing import Any

from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings

# Sensible free-tier defaults when provider-specific MODEL_* is unset.
_DEFAULT_MODELS: dict[str, str] = {
    "gemini": "gemini-3.5-flash",
    "groq": "llama-3.1-8b-instant",
    "ollama": "llama3.2",
    "openrouter": "openai/gpt-oss-20b:free",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-latest",
    "azure_openai": "gpt-4o-mini",
}


class LLMProvider(str, Enum):
    """Supported model providers (extensible via ProviderFactory.register)."""

    GEMINI = "gemini"
    GROQ = "groq"
    OLLAMA = "ollama"
    OPENROUTER = "openrouter"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE_OPENAI = "azure_openai"


class LLMConfig(BaseModel):
    """Normalized LLM settings used by the LLM service and CrewAI."""

    provider: LLMProvider = LLMProvider.GEMINI
    model_name: str = "gemini-3.5-flash"
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, gt=0)
    timeout_seconds: float = Field(default=60.0, gt=0)
    max_retries: int = Field(default=3, ge=0)

    # Provider selection / fallback
    primary_provider: LLMProvider = LLMProvider.GEMINI
    fallback_providers: list[LLMProvider] = Field(default_factory=list)
    fallback_enabled: bool = True
    fallback_on_missing_key: bool = True
    retry_backoff_seconds: float = Field(default=1.0, ge=0.0)

    # Per-provider model overrides (optional)
    gemini_model: str | None = None
    groq_model: str | None = None
    ollama_model: str | None = None
    openrouter_model: str | None = None
    openai_model: str | None = None
    anthropic_model: str | None = None
    azure_model: str | None = None

    # Credentials / endpoints
    gemini_api_key: str | None = None
    groq_api_key: str | None = None
    openrouter_api_key: str | None = None
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    azure_api_key: str | None = None
    azure_endpoint: str | None = None
    azure_api_version: str | None = "2024-08-01-preview"
    ollama_base_url: str = "http://localhost:11434"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    def for_provider(self, provider: LLMProvider) -> LLMConfig:
        """Return a copy bound to a specific provider (used by factory + fallback)."""
        return self.model_copy(update={"provider": provider})

    def provider_chain(self) -> list[LLMProvider]:
        """Ordered providers: primary first, then unique fallbacks."""
        primary = self.primary_provider or self.provider
        chain: list[LLMProvider] = [primary]
        if not self.fallback_enabled:
            return chain
        for provider in self.fallback_providers:
            if provider not in chain:
                chain.append(provider)
        return chain

    def model_name_for(self, provider: LLMProvider) -> str:
        """Resolve the best model id for a provider."""
        overrides = {
            LLMProvider.GEMINI: self.gemini_model,
            LLMProvider.GROQ: self.groq_model,
            LLMProvider.OLLAMA: self.ollama_model,
            LLMProvider.OPENROUTER: self.openrouter_model,
            LLMProvider.OPENAI: self.openai_model,
            LLMProvider.ANTHROPIC: self.anthropic_model,
            LLMProvider.AZURE_OPENAI: self.azure_model,
        }
        override = overrides.get(provider)
        if override and str(override).strip():
            return str(override).strip()

        # MODEL_NAME applies only to the configured primary / active provider.
        if provider in {self.primary_provider, self.provider} and self.model_name:
            return self.model_name

        return _DEFAULT_MODELS.get(provider.value, self.model_name)

    def resolved_model_for(self, provider: LLMProvider | None = None) -> str:
        active = provider or self.provider
        name = self.model_name_for(active)
        if active is LLMProvider.GEMINI:
            return name.removeprefix("models/")
        return self.litellm_model_for(active)

    @property
    def resolved_model(self) -> str:
        return self.resolved_model_for(self.provider)

    def litellm_model_for(self, provider: LLMProvider) -> str:
        name = self.model_name_for(provider)
        if provider is LLMProvider.GEMINI:
            clean = name.removeprefix("models/")
            return clean if clean.startswith("gemini/") else f"gemini/{clean}"
        if provider is LLMProvider.GROQ:
            return name if name.startswith("groq/") else f"groq/{name}"
        if provider is LLMProvider.OLLAMA:
            # LiteLLM accepts ollama/<model> or ollama_chat/<model>
            if name.startswith("ollama/") or name.startswith("ollama_chat/"):
                return name
            return f"ollama/{name}"
        if provider is LLMProvider.OPENROUTER:
            if name.startswith("openrouter/"):
                return name
            return f"openrouter/{name}"
        if provider is LLMProvider.OPENAI:
            return name if "/" in name else f"openai/{name}"
        if provider is LLMProvider.ANTHROPIC:
            return name if name.startswith("anthropic/") else f"anthropic/{name}"
        if provider is LLMProvider.AZURE_OPENAI:
            return name if name.startswith("azure/") else f"azure/{name}"
        raise ValueError(f"Unsupported provider: {provider}")

    @property
    def litellm_model(self) -> str:
        return self.litellm_model_for(self.provider)

    def resolve_api_key_for(self, provider: LLMProvider | None = None) -> str | None:
        active = provider or self.provider
        mapping = {
            LLMProvider.GEMINI: self.gemini_api_key,
            LLMProvider.GROQ: self.groq_api_key,
            LLMProvider.OPENROUTER: self.openrouter_api_key,
            LLMProvider.OPENAI: self.openai_api_key,
            LLMProvider.ANTHROPIC: self.anthropic_api_key,
            LLMProvider.AZURE_OPENAI: self.azure_api_key,
            LLMProvider.OLLAMA: "ollama-local",  # sentinel — local server needs no cloud key
        }
        return mapping.get(active)

    def resolve_api_key(self) -> str | None:
        return self.resolve_api_key_for(self.provider)

    def missing_credentials_message_for(
        self,
        provider: LLMProvider | None = None,
    ) -> str | None:
        active = provider or self.provider
        if active is LLMProvider.OLLAMA:
            return None
        key = self.resolve_api_key_for(active)
        if key:
            if active is LLMProvider.AZURE_OPENAI and not self.azure_endpoint:
                return (
                    "AZURE_OPENAI_ENDPOINT is required when LLM_PROVIDER=azure_openai"
                )
            if active is LLMProvider.OPENROUTER and ":free" not in self.model_name_for(
                active
            ):
                # Soft warning only — still allow paid models if explicitly configured.
                pass
            return None

        env_names = {
            LLMProvider.GEMINI: "GEMINI_API_KEY",
            LLMProvider.GROQ: "GROQ_API_KEY",
            LLMProvider.OPENROUTER: "OPENROUTER_API_KEY",
            LLMProvider.OPENAI: "OPENAI_API_KEY",
            LLMProvider.ANTHROPIC: "ANTHROPIC_API_KEY",
            LLMProvider.AZURE_OPENAI: "AZURE_OPENAI_API_KEY",
        }
        env_name = env_names.get(active, f"{active.value.upper()}_API_KEY")
        return f"{env_name} is missing. Set it in Backend/.env before calling the LLM."

    def missing_credentials_message(self) -> str | None:
        return self.missing_credentials_message_for(self.provider)

    def litellm_kwargs_for(
        self,
        provider: LLMProvider,
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "model": self.litellm_model_for(provider),
            "temperature": self.temperature if temperature is None else temperature,
            "max_tokens": self.max_tokens if max_tokens is None else max_tokens,
            "timeout": self.timeout_seconds,
        }
        if provider is LLMProvider.OLLAMA:
            kwargs["api_base"] = self.ollama_base_url
            # Ollama ignores api_key; LiteLLM still accepts a placeholder.
            kwargs["api_key"] = "ollama"
        elif provider is LLMProvider.OPENROUTER:
            kwargs["api_key"] = self.openrouter_api_key
            kwargs["api_base"] = self.openrouter_base_url
            kwargs["extra_headers"] = {
                "HTTP-Referer": "https://github.com/ai-engineering-assistant",
                "X-Title": "AI Engineering Assistant",
            }
        elif provider is LLMProvider.GROQ:
            kwargs["api_key"] = self.groq_api_key
        elif provider is LLMProvider.AZURE_OPENAI:
            kwargs["api_key"] = self.azure_api_key
            kwargs["api_base"] = self.azure_endpoint
            kwargs["api_version"] = self.azure_api_version
        elif provider is LLMProvider.OPENAI:
            kwargs["api_key"] = self.openai_api_key
        elif provider is LLMProvider.ANTHROPIC:
            kwargs["api_key"] = self.anthropic_api_key
        elif provider is LLMProvider.GEMINI:
            kwargs["api_key"] = self.gemini_api_key
        return kwargs

    def litellm_kwargs(self) -> dict[str, Any]:
        """Backward-compatible kwargs for the active provider."""
        return self.litellm_kwargs_for(self.provider)


def _parse_provider_list(value: str | list[str] | None) -> list[LLMProvider]:
    if value is None:
        return []
    if isinstance(value, list):
        items = value
    else:
        items = [part.strip() for part in str(value).split(",") if part.strip()]
    providers: list[LLMProvider] = []
    for item in items:
        providers.append(LLMProvider(str(item).strip().lower()))
    return providers


def llm_config_from_settings(settings: Settings) -> LLMConfig:
    """Map application Settings into a provider-agnostic LLMConfig."""
    primary_raw = (settings.primary_provider or settings.llm_provider or "gemini").lower()
    primary = LLMProvider(primary_raw)
    return LLMConfig(
        provider=primary,
        primary_provider=primary,
        fallback_providers=_parse_provider_list(settings.fallback_providers),
        fallback_enabled=settings.llm_fallback_enabled,
        fallback_on_missing_key=settings.llm_fallback_on_missing_key,
        retry_backoff_seconds=settings.llm_retry_backoff_seconds,
        model_name=settings.model_name,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        timeout_seconds=settings.llm_timeout,
        max_retries=settings.llm_max_retries,
        gemini_model=settings.gemini_model,
        groq_model=settings.groq_model,
        ollama_model=settings.ollama_model,
        openrouter_model=settings.openrouter_model,
        openai_model=settings.openai_model,
        anthropic_model=settings.anthropic_model,
        azure_model=settings.azure_model,
        gemini_api_key=settings.gemini_api_key,
        groq_api_key=settings.groq_api_key,
        openrouter_api_key=settings.openrouter_api_key,
        openai_api_key=settings.openai_api_key,
        anthropic_api_key=settings.anthropic_api_key,
        azure_api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        azure_api_version=settings.azure_openai_api_version,
        ollama_base_url=settings.ollama_base_url,
        openrouter_base_url=settings.openrouter_base_url,
    )


@lru_cache
def get_llm_config() -> LLMConfig:
    """Cached LLM configuration bound to current process settings."""
    return llm_config_from_settings(get_settings())


def build_crewai_llm(config: LLMConfig | None = None) -> Any:
    """Create a CrewAI ``LLM`` instance from ``LLMConfig``."""
    from crewai import LLM

    cfg = config or get_llm_config()
    missing = cfg.missing_credentials_message()
    if missing:
        raise ValueError(missing)

    kwargs = cfg.litellm_kwargs()
    # CrewAI LLM expects model/api_key style kwargs (LiteLLM under the hood).
    crew_kwargs: dict[str, Any] = {
        "model": kwargs["model"],
        "temperature": kwargs["temperature"],
        "max_tokens": kwargs["max_tokens"],
        "timeout": kwargs["timeout"],
        "api_key": kwargs.get("api_key"),
    }
    if kwargs.get("api_base"):
        crew_kwargs["base_url"] = kwargs["api_base"]
        crew_kwargs["api_base"] = kwargs["api_base"]
    if kwargs.get("api_version"):
        crew_kwargs["api_version"] = kwargs["api_version"]
    return LLM(**crew_kwargs)
