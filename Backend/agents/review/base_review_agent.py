"""Base class for specialized review agents (Phase 1.3B).

Each review agent:
  - consumes structured tool / scanner context (does not re-run tools here)
  - calls the shared LLMService via BaseAIAgent patterns
  - returns a validated ``ReviewReport``
"""

from __future__ import annotations

import json
import logging
import time
from abc import abstractmethod
from typing import Any

from agents.base_agent import AgentResult, BaseAIAgent
from agents.prompts.loader import load_prompt
from agents.review.json_utils import extract_json_object
from agents.review.schemas import ReviewReport
from app.services.exceptions import InvalidLLMResponseError
from app.services.llm_service import LLMMessage

logger = logging.getLogger(__name__)


class ReviewAgentError(Exception):
    """Expected validation failure for a review agent."""

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class BaseReviewAgent(BaseAIAgent):
    """Shared review workflow on top of ``BaseAIAgent``."""

    name: str = "base_review_agent"
    prompt_namespace: str = "base_review"
    max_output_tokens: int = 4096

    def validate_context(self, context: dict[str, Any]) -> None:
        """Validate caller context before prompting the LLM."""
        if not isinstance(context, dict):
            raise ReviewAgentError("Review context must be a dictionary.")

    @abstractmethod
    def build_tool_payload(self, context: dict[str, Any]) -> dict[str, Any]:
        """Extract / normalize the structured input sent to the prompt."""

    def build_messages(self, context: dict[str, Any]) -> list[LLMMessage]:
        payload = self.build_tool_payload(context)
        if self._use_compact_json():
            payload_json = json.dumps(payload, separators=(",", ":"), default=str)
        else:
            payload_json = json.dumps(payload, indent=2, default=str)
        system_prompt = load_prompt(self.prompt_namespace, "system")
        task_prompt = load_prompt(self.prompt_namespace, "task")

        user_prompt = (
            f"{task_prompt}\n\n"
            "## Compact Tool Summary\n"
            "The following JSON is a preprocessed summary (not raw tool output). "
            "Use only these facts; do not assume omitted findings.\n"
            f"{payload_json}\n\n"
            "## Required Output Format\n"
            "Respond with a single JSON object only (no markdown outside JSON) using keys:\n"
            "agent, summary, findings, recommendations, severity, confidence.\n"
            "findings must be an array of objects with keys: "
            "title, detail, severity, recommendation, file, line, category.\n"
            "severity must be one of: critical, high, medium, low, info, none.\n"
            "confidence must be a number between 0 and 1.\n"
        )

        logger.info(
            "Prompt created agent=%s system_chars=%s user_chars=%s payload_chars=%s",
            self.name,
            len(system_prompt),
            len(user_prompt),
            len(payload_json),
        )
        return [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_prompt),
        ]

    @staticmethod
    def _use_compact_json() -> bool:
        try:
            from app.core.config import get_settings

            return bool(get_settings().summary_compact_json)
        except Exception:  # noqa: BLE001
            return True

    def run(self, context: dict[str, Any] | None = None) -> AgentResult:
        started = time.perf_counter()
        context = context or {}
        logger.info("Agent started name=%s", self.name)

        try:
            self.validate_context(context)
            messages = self.build_messages(context)
            logger.info(
                "LLM request agent=%s messages=%s",
                self.name,
                [{"role": m.role, "chars": len(m.content)} for m in messages],
            )

            llm_result = self.llm_service.complete(
                messages,
                max_tokens=self.max_output_tokens,
            )
            provider = llm_result.data.get("provider")
            model = llm_result.data.get("model")

            if not llm_result.success:
                elapsed = time.perf_counter() - started
                logger.error(
                    "Agent failed name=%s provider=%s model=%s errors=%s execution_time=%.3fs",
                    self.name,
                    provider,
                    model,
                    llm_result.errors,
                    elapsed,
                )
                return AgentResult(
                    success=False,
                    agent=self.name,
                    execution_time=round(elapsed, 3),
                    data={"llm": llm_result.to_dict()},
                    errors=llm_result.errors,
                )

            content = str(llm_result.data.get("content", ""))
            report, parse_meta = self._parse_report_safe(content)
            elapsed = time.perf_counter() - started
            logger.info(
                "Agent finished name=%s provider=%s model=%s parse_ok=%s recovered=%s "
                "fallback=%s execution_time=%.3fs chars=%s findings=%s",
                self.name,
                provider,
                model,
                parse_meta.get("parse_ok"),
                parse_meta.get("recovered"),
                parse_meta.get("fallback"),
                elapsed,
                len(content),
                len(report.findings),
            )
            return AgentResult(
                success=True,
                agent=self.name,
                execution_time=round(elapsed, 3),
                data={
                    "review": report.to_dict(),
                    "parse": parse_meta,
                    "llm": {
                        "model": model,
                        "provider": provider,
                        "usage": llm_result.data.get("usage"),
                        "raw_content": content,
                    },
                },
            )
        except ReviewAgentError as exc:
            elapsed = time.perf_counter() - started
            logger.warning(
                "Agent validation error name=%s error=%s execution_time=%.3fs",
                self.name,
                exc.message,
                elapsed,
            )
            return AgentResult(
                success=False,
                agent=self.name,
                execution_time=round(elapsed, 3),
                data={"details": exc.details},
                errors=[exc.message],
            )
        except Exception as exc:  # noqa: BLE001 - agent boundary
            elapsed = time.perf_counter() - started
            logger.exception(
                "Agent error name=%s execution_time=%.3fs",
                self.name,
                elapsed,
            )
            return AgentResult(
                success=False,
                agent=self.name,
                execution_time=round(elapsed, 3),
                errors=[f"Agent error: {exc}"],
            )

    def _parse_report_safe(self, content: str) -> tuple[ReviewReport, dict[str, Any]]:
        """Parse/validate LLM JSON; never raise — returns fallback report if needed."""
        warnings: list[str] = []
        payload: dict[str, Any] | None = None
        try:
            payload = extract_json_object(content)
        except InvalidLLMResponseError as exc:
            logger.warning(
                "JSON parse failed agent=%s error=%s preview=%s",
                self.name,
                exc.message,
                (content or "")[:300].replace("\n", "\\n"),
            )
            warnings.append(exc.message)

        if payload is not None:
            try:
                report = self._coerce_report(payload)
                return report, {
                    "parse_ok": True,
                    "recovered": False,
                    "fallback": False,
                    "warnings": warnings,
                }
            except InvalidLLMResponseError as exc:
                logger.warning(
                    "Schema validation failed agent=%s error=%s keys=%s",
                    self.name,
                    exc.message,
                    sorted(payload.keys()),
                )
                warnings.append(exc.message)
                try:
                    # Looser salvage: keep only well-shaped findings.
                    salvaged = {
                        "agent": self.name,
                        "summary": str(payload.get("summary") or "Partial review recovered."),
                        "findings": payload.get("findings")
                        if isinstance(payload.get("findings"), list)
                        else [],
                        "recommendations": payload.get("recommendations")
                        if isinstance(payload.get("recommendations"), list)
                        else [],
                        "severity": payload.get("severity") or "info",
                        "confidence": payload.get("confidence") or 0.3,
                    }
                    report = self._coerce_report(salvaged)
                    logger.info("Schema salvage succeeded agent=%s", self.name)
                    return report, {
                        "parse_ok": True,
                        "recovered": True,
                        "fallback": False,
                        "warnings": warnings,
                    }
                except Exception as salvage_exc:  # noqa: BLE001
                    warnings.append(f"Schema salvage failed: {salvage_exc}")

        fallback = ReviewReport(
            agent=self.name,
            summary=(
                "Review agent returned malformed JSON that could not be recovered. "
                "No structured findings are available from this agent run."
            ),
            findings=[],
            recommendations=[
                "Re-run this review agent; the previous model response was not valid JSON."
            ],
            severity="info",
            confidence=0.0,
        )
        logger.error(
            "Using fallback review report agent=%s warnings=%s",
            self.name,
            warnings,
        )
        return fallback, {
            "parse_ok": False,
            "recovered": False,
            "fallback": True,
            "warnings": warnings,
        }

    def _parse_report(self, content: str) -> ReviewReport:
        payload = extract_json_object(content)
        return self._coerce_report(payload)

    def _coerce_report(self, payload: dict[str, Any]) -> ReviewReport:
        payload = dict(payload)
        payload.setdefault("agent", self.name)
        if "findings" in payload and isinstance(payload["findings"], list):
            normalized_findings: list[dict[str, Any]] = []
            for item in payload["findings"]:
                if isinstance(item, str):
                    normalized_findings.append(
                        {"title": item, "detail": item, "severity": "info"}
                    )
                elif isinstance(item, dict):
                    finding = dict(item)
                    finding.setdefault("title", finding.get("issue") or finding.get("name") or "Finding")
                    finding.setdefault(
                        "detail",
                        finding.get("description")
                        or finding.get("message")
                        or finding.get("title")
                        or "",
                    )
                    normalized_findings.append(finding)
            payload["findings"] = normalized_findings
        elif "findings" not in payload:
            payload["findings"] = []

        if "recommendations" in payload and isinstance(payload["recommendations"], list):
            payload["recommendations"] = [str(item) for item in payload["recommendations"]]
        elif "recommendations" not in payload:
            payload["recommendations"] = []

        if not payload.get("summary"):
            payload["summary"] = f"{self.name} completed without a summary."

        try:
            return ReviewReport.model_validate(payload)
        except Exception as exc:  # noqa: BLE001
            raise InvalidLLMResponseError(
                f"Review response missing required fields: {exc}",
                details={"keys": sorted(payload.keys())},
            ) from exc

    @staticmethod
    def coerce_tool_result(value: Any, *, tool_name: str) -> dict[str, Any]:
        """Normalize ToolResult / dict inputs into a plain dict."""
        if value is None:
            raise ReviewAgentError(
                f"Missing {tool_name} tool output. Pass structured tool results only."
            )
        if hasattr(value, "model_dump"):
            return value.model_dump()
        if hasattr(value, "to_dict"):
            return value.to_dict()
        if isinstance(value, dict):
            return value
        raise ReviewAgentError(
            f"Invalid {tool_name} tool output type: {type(value).__name__}",
        )
