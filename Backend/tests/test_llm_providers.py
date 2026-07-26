"""Unit tests for multi-provider LLM factory, config, and fallback."""

from __future__ import annotations

from typing import Any

import pytest

from app.core.config import Settings
from app.core.llm_config import LLMConfig, LLMProvider, llm_config_from_settings
from app.services.exceptions import (
    LLMQuotaError,
    LLMRateLimitError,
    LLMTimeoutError,
    MissingAPIKeyError,
)
from app.services.llm.base import BaseLLMProvider, ProviderResult
from app.services.llm.factory import ProviderFactory
from app.services.llm.gemini import GeminiProvider
from app.services.llm.groq import GroqProvider
from app.services.llm.ollama import OllamaProvider
from app.services.llm.openrouter import OpenRouterProvider
from app.services.llm_service import LLMMessage, LLMService


def test_settings_support_free_providers() -> None:
    settings = Settings(
        _env_file=None,
        LLM_PROVIDER="groq",
        PRIMARY_PROVIDER="groq",
        FALLBACK_PROVIDERS="ollama,openrouter",
        GROQ_API_KEY="g-key",
        GROQ_MODEL="llama-3.1-8b-instant",
    )
    config = llm_config_from_settings(settings)
    assert config.primary_provider is LLMProvider.GROQ
    assert config.fallback_providers == [LLMProvider.OLLAMA, LLMProvider.OPENROUTER]
    assert config.model_name_for(LLMProvider.GROQ) == "llama-3.1-8b-instant"
    assert config.litellm_model_for(LLMProvider.GROQ) == "groq/llama-3.1-8b-instant"


def test_provider_factory_creates_known_providers() -> None:
    config = LLMConfig(
        provider=LLMProvider.GEMINI,
        gemini_api_key="x",
        groq_api_key="y",
        openrouter_api_key="z",
    )
    assert isinstance(ProviderFactory.create(LLMProvider.GEMINI, config), GeminiProvider)
    assert isinstance(ProviderFactory.create(LLMProvider.GROQ, config), GroqProvider)
    assert isinstance(ProviderFactory.create(LLMProvider.OLLAMA, config), OllamaProvider)
    assert isinstance(
        ProviderFactory.create(LLMProvider.OPENROUTER, config), OpenRouterProvider
    )
    assert "gemini" in ProviderFactory.supported_providers()
    assert "groq" in ProviderFactory.supported_providers()


def test_ollama_does_not_require_api_key() -> None:
    config = LLMConfig(provider=LLMProvider.OLLAMA, ollama_model="llama3.2")
    assert config.missing_credentials_message_for(LLMProvider.OLLAMA) is None
    assert config.litellm_kwargs_for(LLMProvider.OLLAMA)["api_base"] == (
        "http://localhost:11434"
    )


def test_openrouter_prefers_free_model_default() -> None:
    settings = Settings(_env_file=None, LLM_PROVIDER="openrouter", OPENROUTER_API_KEY="k")
    config = llm_config_from_settings(settings)
    model = config.model_name_for(LLMProvider.OPENROUTER)
    assert model.endswith(":free")
    assert "gpt-oss-20b" in model or model.endswith(":free")
    assert config.litellm_model_for(LLMProvider.OPENROUTER).startswith("openrouter/")


def test_provider_chain_dedupes_and_respects_fallback_flag() -> None:
    config = LLMConfig(
        provider=LLMProvider.GEMINI,
        primary_provider=LLMProvider.GEMINI,
        fallback_providers=[LLMProvider.GROQ, LLMProvider.GEMINI, LLMProvider.OLLAMA],
        fallback_enabled=True,
    )
    assert config.provider_chain() == [
        LLMProvider.GEMINI,
        LLMProvider.GROQ,
        LLMProvider.OLLAMA,
    ]
    disabled = config.model_copy(update={"fallback_enabled": False})
    assert disabled.provider_chain() == [LLMProvider.GEMINI]


class _FakeProvider(BaseLLMProvider):
    provider = LLMProvider.GEMINI
    calls = 0
    behavior: list[Any] = []

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ProviderResult:
        _ = messages, temperature, max_tokens
        type(self).calls += 1
        action = self.behavior.pop(0)
        if isinstance(action, Exception):
            raise action
        return ProviderResult(
            content=str(action),
            model="fake-model",
            provider=self.provider.value,
        )


class _FakeFactory:
    providers: dict[LLMProvider, type[_FakeProvider]] = {}

    @classmethod
    def create(cls, provider: LLMProvider, config: LLMConfig) -> BaseLLMProvider:
        _ = config
        impl = cls.providers[provider]
        instance = impl(config)
        instance.provider = provider
        return instance


def test_llm_service_falls_back_on_quota() -> None:
    class Primary(_FakeProvider):
        provider = LLMProvider.GEMINI
        behavior = [LLMQuotaError("quota", details={"provider": "gemini"})]

    class Secondary(_FakeProvider):
        provider = LLMProvider.GROQ
        behavior = ["hello from groq"]

    _FakeFactory.providers = {
        LLMProvider.GEMINI: Primary,
        LLMProvider.GROQ: Secondary,
    }
    Primary.calls = 0
    Secondary.calls = 0

    config = LLMConfig(
        provider=LLMProvider.GEMINI,
        primary_provider=LLMProvider.GEMINI,
        fallback_providers=[LLMProvider.GROQ],
        fallback_enabled=True,
        max_retries=0,
        gemini_api_key="g",
        groq_api_key="r",
        retry_backoff_seconds=0,
    )
    service = LLMService(config=config, factory=_FakeFactory)  # type: ignore[arg-type]
    result = service.complete([LLMMessage(role="user", content="hi")])
    assert result.success is True
    assert result.data["content"] == "hello from groq"
    assert result.data["provider"] == "groq"
    assert result.data["attempted_providers"] == ["gemini", "groq"]
    assert Primary.calls == 1
    assert Secondary.calls == 1


def test_llm_service_retries_then_falls_back_on_timeout() -> None:
    class Primary(_FakeProvider):
        provider = LLMProvider.GEMINI
        behavior = [
            LLMTimeoutError("t1", details={"provider": "gemini"}),
            LLMTimeoutError("t2", details={"provider": "gemini"}),
            LLMRateLimitError("rl", details={"provider": "gemini"}),
        ]

    class Secondary(_FakeProvider):
        provider = LLMProvider.OLLAMA
        behavior = ["local ok"]

    _FakeFactory.providers = {
        LLMProvider.GEMINI: Primary,
        LLMProvider.OLLAMA: Secondary,
    }
    Primary.calls = 0
    Secondary.calls = 0

    config = LLMConfig(
        provider=LLMProvider.GEMINI,
        primary_provider=LLMProvider.GEMINI,
        fallback_providers=[LLMProvider.OLLAMA],
        max_retries=2,
        gemini_api_key="g",
        retry_backoff_seconds=0,
    )
    service = LLMService(config=config, factory=_FakeFactory)  # type: ignore[arg-type]
    result = service.complete([LLMMessage(role="user", content="hi")])
    assert result.success is True
    assert result.data["provider"] == "ollama"
    assert Primary.calls == 3
    assert Secondary.calls == 1


def test_llm_service_skips_missing_key_when_fallback_enabled() -> None:
    class Secondary(_FakeProvider):
        provider = LLMProvider.GROQ
        behavior = ["fallback ok"]

    _FakeFactory.providers = {LLMProvider.GROQ: Secondary}
    Secondary.calls = 0

    config = LLMConfig(
        provider=LLMProvider.GEMINI,
        primary_provider=LLMProvider.GEMINI,
        fallback_providers=[LLMProvider.GROQ],
        fallback_enabled=True,
        fallback_on_missing_key=True,
        gemini_api_key=None,
        groq_api_key="r",
        max_retries=0,
        retry_backoff_seconds=0,
    )
    service = LLMService(config=config, factory=_FakeFactory)  # type: ignore[arg-type]
    result = service.complete([LLMMessage(role="user", content="hi")])
    assert result.success is True
    assert result.data["provider"] == "groq"


def test_gemini_still_default_and_missing_key_without_fallback() -> None:
    settings = Settings(_env_file=None)
    assert settings.llm_provider == "gemini"
    config = LLMConfig(
        provider=LLMProvider.GEMINI,
        primary_provider=LLMProvider.GEMINI,
        fallback_enabled=False,
        gemini_api_key=None,
    )
    result = LLMService(config=config).complete(
        [LLMMessage(role="user", content="Say hello")]
    )
    assert result.success is False
    assert "GEMINI_API_KEY" in result.errors[0]


def test_factory_rejects_unknown_provider() -> None:
    with pytest.raises(ValueError, match="Unsupported"):
        # Simulate unknown by temporarily clearing registry entry via bogus enum use —
        # ValueError from factory when builder missing.
        ProviderFactory._registry.pop(LLMProvider.GROQ, None)
        try:
            ProviderFactory.create(LLMProvider.GROQ, LLMConfig(groq_api_key="x"))
        finally:
            ProviderFactory.register(LLMProvider.GROQ, GroqProvider)
