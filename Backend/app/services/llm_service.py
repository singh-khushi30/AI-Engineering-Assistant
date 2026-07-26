"""Reusable LLM service — provider-agnostic orchestration with fallback.

Architecture:
  LLMService → ProviderFactory → Gemini | Groq | Ollama | OpenRouter | …
"""

from __future__ import annotations

import logging
import time
from typing import Any

from pydantic import BaseModel, Field

from app.core.llm_config import LLMConfig, LLMProvider, get_llm_config
from app.services.exceptions import (
    InvalidLLMResponseError,
    LLMServiceError,
    MissingAPIKeyError,
)
from app.services.llm.factory import ProviderFactory

logger = logging.getLogger(__name__)


class LLMMessage(BaseModel):
    role: str
    content: str


class LLMResult(BaseModel):
    """Structured LLM response — mirrors the ToolResult shape for consistency."""

    success: bool
    tool: str = "llm"
    execution_time: float
    data: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


class LLMService:
    """Provider-aware completion client with retries and automatic fallback."""

    def __init__(
        self,
        config: LLMConfig | None = None,
        *,
        factory: type[ProviderFactory] | None = None,
    ) -> None:
        self.config = config or get_llm_config()
        self.factory = factory or ProviderFactory

    def complete(
        self,
        messages: list[LLMMessage] | list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResult:
        """Send a chat completion with per-provider retries and provider fallback."""
        started = time.perf_counter()
        try:
            normalized = self._normalize_messages(messages)
        except InvalidLLMResponseError as exc:
            elapsed = time.perf_counter() - started
            return LLMResult(
                success=False,
                execution_time=round(elapsed, 3),
                data={"error": exc.to_dict()},
                errors=[exc.message],
            )

        chain = self.config.provider_chain()
        logger.info(
            "LLM request started primary=%s fallbacks=%s messages=%s",
            chain[0].value,
            [p.value for p in chain[1:]],
            len(normalized),
        )
        logger.debug("Prompt sent: %s", normalized)

        last_error: Exception | None = None
        attempted: list[str] = []

        for provider_index, provider in enumerate(chain):
            attempted.append(provider.value)
            missing = self.config.missing_credentials_message_for(provider)
            if missing:
                logger.warning(
                    "LLM provider skipped provider=%s reason=%s",
                    provider.value,
                    missing,
                )
                last_error = MissingAPIKeyError(missing, details={"provider": provider.value})
                if (
                    self.config.fallback_enabled
                    and self.config.fallback_on_missing_key
                    and provider_index < len(chain) - 1
                ):
                    logger.info(
                        "Falling back after missing credentials provider=%s next=%s",
                        provider.value,
                        chain[provider_index + 1].value,
                    )
                    continue
                break

            result = self._complete_with_provider(
                provider,
                normalized,
                temperature=temperature,
                max_tokens=max_tokens,
                started=started,
                attempted=attempted,
            )
            if result.success:
                return result

            error_payload = result.data.get("error") or {}
            fallback_eligible = bool(error_payload.get("fallback_eligible"))
            last_error = LLMServiceError(
                result.errors[0] if result.errors else "LLM provider failed",
                details=error_payload.get("details") or {"provider": provider.value},
            )
            last_error.fallback_eligible = fallback_eligible
            if isinstance(error_payload.get("error_code"), str):
                object.__setattr__(last_error, "error_code", error_payload["error_code"])

            if (
                fallback_eligible
                and self.config.fallback_enabled
                and provider_index < len(chain) - 1
            ):
                logger.warning(
                    "Falling back provider=%s next=%s reason=%s",
                    provider.value,
                    chain[provider_index + 1].value,
                    result.errors[0] if result.errors else "unknown",
                )
                continue
            return result

        elapsed = time.perf_counter() - started
        message = (
            last_error.message
            if isinstance(last_error, LLMServiceError)
            else f"LLM request failed: {last_error}"
        )
        error_payload = (
            last_error.to_dict()
            if isinstance(last_error, LLMServiceError)
            else {"error_code": "llm_error", "message": message, "details": {}}
        )
        error_payload["attempted_providers"] = attempted
        logger.error(
            "LLM request failed providers=%s error=%s",
            attempted,
            message,
        )
        return LLMResult(
            success=False,
            execution_time=round(elapsed, 3),
            data={"error": error_payload},
            errors=[message],
        )

    def _complete_with_provider(
        self,
        provider: LLMProvider,
        messages: list[dict[str, str]],
        *,
        temperature: float | None,
        max_tokens: int | None,
        started: float,
        attempted: list[str],
    ) -> LLMResult:
        attempts = self.config.max_retries + 1
        last_error: Exception | None = None
        client = self.factory.create(provider, self.config)
        model = self.config.resolved_model_for(provider)

        logger.info(
            "LLM provider attempt provider=%s model=%s max_retries=%s",
            provider.value,
            model,
            self.config.max_retries,
        )

        for attempt in range(1, attempts + 1):
            try:
                provider_result = client.complete(
                    messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                elapsed = time.perf_counter() - started
                logger.info(
                    "LLM response received provider=%s attempt=%s execution_time=%.3fs chars=%s",
                    provider.value,
                    attempt,
                    elapsed,
                    len(provider_result.content),
                )
                return LLMResult(
                    success=True,
                    execution_time=round(elapsed, 3),
                    data={
                        "content": provider_result.content,
                        "model": provider_result.model,
                        "provider": provider_result.provider,
                        "attempt": attempt,
                        "attempted_providers": list(attempted),
                        "usage": provider_result.usage,
                    },
                )
            except InvalidLLMResponseError as exc:
                elapsed = time.perf_counter() - started
                logger.error(
                    "LLM non-retryable error provider=%s: %s",
                    provider.value,
                    exc.message,
                )
                return LLMResult(
                    success=False,
                    execution_time=round(elapsed, 3),
                    data={"error": exc.to_dict()},
                    errors=[exc.message],
                )
            except LLMServiceError as exc:
                last_error = exc
                logger.warning(
                    "LLM attempt %s/%s failed provider=%s code=%s: %s",
                    attempt,
                    attempts,
                    provider.value,
                    exc.error_code,
                    exc.message,
                )
                if not exc.fallback_eligible and not isinstance(exc, MissingAPIKeyError):
                    # Unexpected non-fallback errors still retry within provider budget.
                    pass
                if attempt >= attempts:
                    break
                delay = min(
                    self.config.retry_backoff_seconds * (2 ** (attempt - 1)),
                    8.0,
                )
                time.sleep(delay)
            except Exception as exc:  # noqa: BLE001 - service boundary
                last_error = LLMServiceError(
                    f"Unexpected LLM failure: {exc}",
                    details={"provider": provider.value},
                )
                logger.exception(
                    "LLM unexpected failure provider=%s attempt=%s",
                    provider.value,
                    attempt,
                )
                if attempt >= attempts:
                    break
                delay = min(
                    self.config.retry_backoff_seconds * (2 ** (attempt - 1)),
                    8.0,
                )
                time.sleep(delay)

        elapsed = time.perf_counter() - started
        message = (
            last_error.message
            if isinstance(last_error, LLMServiceError)
            else f"LLM request failed: {last_error}"
        )
        error_payload = (
            last_error.to_dict()
            if isinstance(last_error, LLMServiceError)
            else {
                "error_code": "llm_error",
                "message": message,
                "details": {"provider": provider.value},
                "fallback_eligible": True,
            }
        )
        return LLMResult(
            success=False,
            execution_time=round(elapsed, 3),
            data={"error": error_payload},
            errors=[message],
        )

    @staticmethod
    def _normalize_messages(
        messages: list[LLMMessage] | list[dict[str, str]],
    ) -> list[dict[str, str]]:
        normalized: list[dict[str, str]] = []
        for message in messages:
            if isinstance(message, LLMMessage):
                normalized.append({"role": message.role, "content": message.content})
            else:
                normalized.append(
                    {
                        "role": str(message["role"]),
                        "content": str(message["content"]),
                    }
                )
        if not normalized:
            raise InvalidLLMResponseError("messages must not be empty")
        return normalized
