"""Google Gemini provider — official google-genai SDK (unchanged behavior)."""

from __future__ import annotations

import logging

from app.core.llm_config import LLMProvider
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
from app.services.llm.litellm_adapter import classify_provider_error

logger = logging.getLogger(__name__)


class GeminiProvider(BaseLLMProvider):
    """Primary production provider — do not remove or weaken."""

    provider = LLMProvider.GEMINI

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ProviderResult:
        try:
            from google import genai
            from google.genai import errors as genai_errors
            from google.genai import types
        except ImportError as exc:
            raise LLMServiceError(
                "google-genai is not installed. It is required for the Gemini provider."
            ) from exc

        api_key = self.config.resolve_api_key_for(LLMProvider.GEMINI)
        timeout_ms = int(self.config.timeout_seconds * 1000)
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=timeout_ms),
        )

        system_chunks = [m["content"] for m in messages if m["role"] == "system"]
        conversation: list[types.Content] = []
        for message in messages:
            role = message["role"]
            if role == "system":
                continue
            gemini_role = "model" if role == "assistant" else "user"
            conversation.append(
                types.Content(
                    role=gemini_role,
                    parts=[types.Part.from_text(text=message["content"])],
                )
            )

        if not conversation:
            raise InvalidLLMResponseError(
                "Gemini request requires at least one non-system message."
            )

        model = self.config.resolved_model_for(LLMProvider.GEMINI)
        config = types.GenerateContentConfig(
            temperature=self.config.temperature if temperature is None else temperature,
            max_output_tokens=self.config.max_tokens if max_tokens is None else max_tokens,
            system_instruction="\n\n".join(system_chunks) if system_chunks else None,
        )

        logger.debug("Gemini invoke model=%s messages=%s", model, len(conversation))

        try:
            response = client.models.generate_content(
                model=model,
                contents=conversation,
                config=config,
            )
        except genai_errors.ClientError as exc:
            status = getattr(exc, "code", None) or getattr(exc, "status_code", None)
            text = str(exc).lower()
            details = {"provider": self.provider.value, "status": status}
            if status in (401, 403) or "api key" in text or "permission" in text:
                raise MissingAPIKeyError(
                    "Gemini authentication failed. Check GEMINI_API_KEY in .env.",
                    details=details,
                ) from exc
            if status == 429 or "rate" in text or "resource exhausted" in text:
                if "quota" in text:
                    raise LLMQuotaError("Gemini quota exceeded.", details=details) from exc
                raise LLMRateLimitError("Gemini rate limit exceeded.", details=details) from exc
            if status in (502, 503, 504):
                raise LLMUnavailableError(
                    "Gemini is temporarily unavailable.",
                    details=details,
                ) from exc
            raise LLMServiceError(
                f"Gemini client error: {exc}",
                details=details,
            ) from exc
        except genai_errors.ServerError as exc:
            raise LLMUnavailableError(
                f"Gemini server error: {exc}",
                details={"provider": self.provider.value},
            ) from exc
        except Exception as exc:  # noqa: BLE001
            mapped = classify_provider_error(
                exc,
                provider=self.provider,
                timeout_seconds=self.config.timeout_seconds,
            )
            if isinstance(mapped, LLMTimeoutError):
                raise LLMTimeoutError(
                    f"Gemini request timed out after {self.config.timeout_seconds}s",
                    details={"provider": self.provider.value},
                ) from exc
            if isinstance(mapped, LLMConnectionError):
                raise LLMConnectionError(
                    f"Gemini connection failure: {exc}",
                    details={"provider": self.provider.value},
                ) from exc
            raise mapped from exc

        content = (response.text or "").strip() if getattr(response, "text", None) else ""
        if not content:
            raise InvalidLLMResponseError(
                "Gemini returned an empty response.",
                details={"model": model},
            )

        usage = None
        raw_usage = getattr(response, "usage_metadata", None)
        if raw_usage is not None:
            if hasattr(raw_usage, "model_dump"):
                usage = raw_usage.model_dump()
            else:
                usage = {
                    "prompt_token_count": getattr(raw_usage, "prompt_token_count", None),
                    "candidates_token_count": getattr(
                        raw_usage, "candidates_token_count", None
                    ),
                    "total_token_count": getattr(raw_usage, "total_token_count", None),
                }

        return ProviderResult(
            content=content,
            model=model,
            provider=self.provider.value,
            usage=usage,
        )
