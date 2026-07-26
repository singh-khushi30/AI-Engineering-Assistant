"""Shared LiteLLM adapter used by OpenAI-compatible and routed providers."""

from __future__ import annotations

import logging
from typing import Any

from app.core.llm_config import LLMConfig, LLMProvider
from app.services.exceptions import (
    InvalidLLMResponseError,
    LLMConnectionError,
    LLMQuotaError,
    LLMRateLimitError,
    LLMServiceError,
    LLMTimeoutError,
    LLMUnavailableError,
    MissingAPIKeyError,
)
from app.services.llm.base import BaseLLMProvider, ProviderResult

logger = logging.getLogger(__name__)


def classify_provider_error(
    exc: Exception,
    *,
    provider: LLMProvider,
    timeout_seconds: float,
) -> LLMServiceError:
    """Map vendor/LiteLLM exceptions into structured, fallback-aware errors."""
    text = str(exc).lower()
    status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    details = {"provider": provider.value, "status": status, "reason": str(exc)}

    if status in (401, 403) or "api key" in text or "authentication" in text or "unauthorized" in text:
        return MissingAPIKeyError(
            f"{provider.value} authentication failed. Check the API key / endpoint in .env.",
            details=details,
        )
    if status == 429 or "rate limit" in text or "ratelimit" in text or "too many requests" in text:
        return LLMRateLimitError(
            f"{provider.value} rate limit exceeded.",
            details=details,
        )
    if "quota" in text or "resource exhausted" in text or "billing" in text:
        return LLMQuotaError(
            f"{provider.value} quota exceeded.",
            details=details,
        )
    if status in (502, 503, 504) or "unavailable" in text or "overloaded" in text:
        return LLMUnavailableError(
            f"{provider.value} is temporarily unavailable.",
            details=details,
        )
    if "timeout" in text or "timed out" in text:
        return LLMTimeoutError(
            f"{provider.value} request timed out after {timeout_seconds}s",
            details=details,
        )
    if "connection" in text or "connect" in text or "dns" in text:
        return LLMConnectionError(
            f"{provider.value} connection failure: {exc}",
            details=details,
        )
    return LLMServiceError(
        f"{provider.value} provider error: {exc}",
        details=details,
    )


class LiteLLMProvider(BaseLLMProvider):
    """Generic LiteLLM-backed provider (OpenAI-compatible APIs, routers, etc.)."""

    provider: LLMProvider

    def __init__(self, config: LLMConfig, provider: LLMProvider | None = None) -> None:
        super().__init__(config)
        if provider is not None:
            self.provider = provider
        elif not hasattr(self, "provider") or self.provider is None:
            self.provider = config.provider

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ProviderResult:
        try:
            from litellm import completion
            from litellm.exceptions import (
                APIConnectionError,
                AuthenticationError,
                RateLimitError,
                Timeout,
            )
        except ImportError as exc:
            raise LLMServiceError(
                "litellm is not installed. It is required for non-Gemini providers."
            ) from exc

        kwargs = self._build_kwargs(temperature=temperature, max_tokens=max_tokens)
        kwargs["messages"] = messages
        kwargs["num_retries"] = 0

        logger.debug(
            "LiteLLM invoke provider=%s model=%s",
            self.provider.value,
            kwargs.get("model"),
        )

        try:
            response = completion(**kwargs)
        except AuthenticationError as exc:
            raise MissingAPIKeyError(
                f"{self.provider.value} authentication failed. Check credentials in .env.",
                details={"provider": self.provider.value},
            ) from exc
        except RateLimitError as exc:
            raise LLMRateLimitError(
                f"{self.provider.value} rate limit exceeded.",
                details={"provider": self.provider.value},
            ) from exc
        except Timeout as exc:
            raise LLMTimeoutError(
                f"{self.provider.value} request timed out after {self.config.timeout_seconds}s",
                details={"provider": self.provider.value},
            ) from exc
        except APIConnectionError as exc:
            raise LLMConnectionError(
                f"Failed to connect to {self.provider.value}.",
                details={"provider": self.provider.value, "reason": str(exc)},
            ) from exc
        except Exception as exc:  # noqa: BLE001
            raise classify_provider_error(
                exc,
                provider=self.provider,
                timeout_seconds=self.config.timeout_seconds,
            ) from exc

        try:
            content = response.choices[0].message.content
        except (AttributeError, IndexError, KeyError, TypeError) as exc:
            raise InvalidLLMResponseError(
                f"{self.provider.value} returned an invalid or empty response payload.",
                details={"raw_type": type(response).__name__},
            ) from exc

        if content is None or not str(content).strip():
            raise InvalidLLMResponseError(
                f"{self.provider.value} returned an empty response.",
                details={"model": self.config.resolved_model_for(self.provider)},
            )

        usage = self._extract_usage(response)
        model = self.config.resolved_model_for(self.provider)
        return ProviderResult(
            content=str(content).strip(),
            model=model,
            provider=self.provider.value,
            usage=usage,
        )

    def _build_kwargs(
        self,
        *,
        temperature: float | None,
        max_tokens: int | None,
    ) -> dict[str, Any]:
        return self.config.litellm_kwargs_for(
            self.provider,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    @staticmethod
    def _extract_usage(response: Any) -> dict[str, Any] | None:
        raw_usage = getattr(response, "usage", None)
        if raw_usage is None:
            return None
        if hasattr(raw_usage, "model_dump"):
            return raw_usage.model_dump()
        if isinstance(raw_usage, dict):
            return raw_usage
        return {
            "prompt_tokens": getattr(raw_usage, "prompt_tokens", None),
            "completion_tokens": getattr(raw_usage, "completion_tokens", None),
            "total_tokens": getattr(raw_usage, "total_tokens", None),
        }
