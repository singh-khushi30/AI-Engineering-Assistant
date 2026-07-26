"""JSON helpers for review-agent LLM responses.

Handles common LLM malformations without weakening the required schema:
  - markdown fences (```json ... ```)
  - prose before/after JSON
  - trailing commas
  - smart quotes
  - lightly truncated objects (best-effort brace/string closure)
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.services.exceptions import InvalidLLMResponseError

logger = logging.getLogger(__name__)

_FENCE_BLOCK_RE = re.compile(
    r"```(?:json|JSON)?\s*\n?(.*?)```",
    re.DOTALL,
)
_SMART_QUOTES = {
    "\u201c": '"',
    "\u201d": '"',
    "\u2018": "'",
    "\u2019": "'",
}


def extract_json_object(text: str) -> dict[str, Any]:
    """Parse a JSON object from raw LLM text with recovery attempts."""
    cleaned = (text or "").strip()
    if not cleaned:
        raise InvalidLLMResponseError("LLM returned an empty response for review parsing.")

    candidates = _candidate_payloads(cleaned)
    last_error: Exception | None = None

    for index, candidate in enumerate(candidates):
        for variant in _variants(candidate):
            try:
                payload = json.loads(variant)
            except json.JSONDecodeError as exc:
                last_error = exc
                continue
            if isinstance(payload, dict):
                if index > 0 or variant != candidate:
                    logger.info(
                        "JSON recovered strategy_index=%s variant_changed=%s keys=%s",
                        index,
                        variant != candidate,
                        sorted(payload.keys()),
                    )
                return payload
            last_error = InvalidLLMResponseError("Parsed JSON was not an object.")

    logger.error(
        "JSON parse failed candidates=%s reason=%s preview=%s",
        len(candidates),
        last_error,
        cleaned[:400].replace("\n", "\\n"),
    )
    raise InvalidLLMResponseError(
        "Failed to parse review agent JSON response.",
        details={
            "reason": str(last_error) if last_error else "unknown",
            "preview": cleaned[:400],
            "chars": len(cleaned),
        },
    )


def _candidate_payloads(text: str) -> list[str]:
    candidates: list[str] = []

    for match in _FENCE_BLOCK_RE.finditer(text):
        block = match.group(1).strip()
        if block:
            candidates.append(block)

    candidates.append(text)

    balanced = _extract_balanced_object(text)
    if balanced:
        candidates.append(balanced)

    # Deduplicate while preserving order
    unique: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        key = item.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(key)
    return unique


def _variants(candidate: str) -> list[str]:
    normalized = _normalize_text(candidate)
    variants = [normalized, _strip_trailing_commas(normalized)]
    repaired = _repair_truncated_json(_strip_trailing_commas(normalized))
    if repaired and repaired not in variants:
        variants.append(repaired)
    return variants


def _normalize_text(text: str) -> str:
    cleaned = text.strip()
    for src, dst in _SMART_QUOTES.items():
        cleaned = cleaned.replace(src, dst)
    # Remove BOM / zero-width chars that sometimes appear in LLM output.
    cleaned = cleaned.replace("\ufeff", "").replace("\u200b", "")
    return cleaned


def _strip_trailing_commas(text: str) -> str:
    return re.sub(r",(\s*[}\]])", r"\1", text)


def _extract_balanced_object(text: str) -> str | None:
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]
    # Incomplete object — return from first brace for repair pass.
    return text[start:]


def _repair_truncated_json(text: str) -> str | None:
    """Best-effort close of truncated JSON objects/arrays/strings."""
    if not text or not text.lstrip().startswith("{"):
        return None

    stack: list[str] = []
    in_string = False
    escape = False
    last_safe = 0

    for index, char in enumerate(text):
        if in_string:
            if escape:
                escape = False
                continue
            if char == "\\":
                escape = True
                continue
            if char == '"':
                in_string = False
                last_safe = index
            continue

        if char == '"':
            in_string = True
            continue
        if char in "{[":
            stack.append("}" if char == "{" else "]")
            last_safe = index
        elif char in "}]":
            if stack and stack[-1] == char:
                stack.pop()
                last_safe = index
        elif char in ",:":
            last_safe = index

    repaired = text
    if in_string:
        # Close the open string, then drop a dangling incomplete key/value if needed.
        repaired = text + '"'
        # If we closed mid-value after a colon/comma, keep it; if mid-key, trim back.
        if repaired.rstrip().endswith(':"') or repaired.rstrip().endswith(',"'):
            # empty string value / empty next key — prefer trimming to last safe comma/brace
            trimmed = text[: last_safe + 1].rstrip().rstrip(",")
            repaired = trimmed
            # rebuild stack on trimmed content
            return _repair_truncated_json(trimmed) or (trimmed + _close_suffix_from(trimmed))

    suffix = _close_suffix_from(repaired)
    candidate = repaired.rstrip().rstrip(",") + suffix
    try:
        payload = json.loads(candidate)
    except json.JSONDecodeError:
        # Second attempt: truncate to last complete top-level finding-like structure.
        truncated = _truncate_to_last_complete_value(text)
        if not truncated:
            return None
        candidate = truncated.rstrip().rstrip(",") + _close_suffix_from(truncated)
        try:
            payload = json.loads(candidate)
        except json.JSONDecodeError:
            return None
    return candidate if isinstance(payload, dict) else None


def _close_suffix_from(text: str) -> str:
    stack: list[str] = []
    in_string = False
    escape = False
    for char in text:
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            stack.append("}")
        elif char == "[":
            stack.append("]")
        elif char in "}]" and stack and stack[-1] == char:
            stack.pop()
    if in_string:
        return '"' + "".join(reversed(stack))
    return "".join(reversed(stack))


def _truncate_to_last_complete_value(text: str) -> str | None:
    """Trim to the last comma/brace that likely ended a complete value."""
    for marker in ("},", "]", "}"):
        position = text.rfind(marker)
        if position != -1:
            return text[: position + 1]
    return None
