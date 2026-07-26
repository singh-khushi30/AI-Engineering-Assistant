"""JSON helpers for review-agent LLM responses."""

from __future__ import annotations

import json
import re
from typing import Any

from app.services.exceptions import InvalidLLMResponseError

_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL | re.IGNORECASE)


def extract_json_object(text: str) -> dict[str, Any]:
    """Parse a JSON object from raw LLM text (plain or fenced)."""
    cleaned = (text or "").strip()
    if not cleaned:
        raise InvalidLLMResponseError("LLM returned an empty response for review parsing.")

    candidates: list[str] = [cleaned]
    fenced = _FENCE_RE.search(cleaned)
    if fenced:
        candidates.insert(0, fenced.group(1).strip())

    # Also try substring from first { to last }
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidates.append(cleaned[start : end + 1])

    last_error: Exception | None = None
    for candidate in candidates:
        try:
            payload = json.loads(candidate)
        except json.JSONDecodeError as exc:
            last_error = exc
            continue
        if isinstance(payload, dict):
            return payload
        last_error = InvalidLLMResponseError("Parsed JSON was not an object.")

    raise InvalidLLMResponseError(
        "Failed to parse review agent JSON response.",
        details={"reason": str(last_error) if last_error else "unknown"},
    )
