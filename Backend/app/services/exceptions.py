"""Structured exceptions for the LLM service layer."""

from __future__ import annotations

from typing import Any


class LLMServiceError(Exception):
    """Base class for LLM service failures."""

    error_code: str = "llm_error"
    # When True, LLMService may switch to the next FALLBACK_PROVIDERS entry.
    fallback_eligible: bool = False

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
            "fallback_eligible": self.fallback_eligible,
        }


class MissingAPIKeyError(LLMServiceError):
    error_code = "missing_api_key"
    fallback_eligible = True


class LLMTimeoutError(LLMServiceError):
    error_code = "api_timeout"
    fallback_eligible = True


class LLMConnectionError(LLMServiceError):
    error_code = "connection_failure"
    fallback_eligible = True


class LLMRateLimitError(LLMServiceError):
    error_code = "rate_limit"
    fallback_eligible = True


class LLMQuotaError(LLMServiceError):
    error_code = "quota_exceeded"
    fallback_eligible = True


class LLMUnavailableError(LLMServiceError):
    error_code = "provider_unavailable"
    fallback_eligible = True


class InvalidLLMResponseError(LLMServiceError):
    error_code = "invalid_response"
    fallback_eligible = False
