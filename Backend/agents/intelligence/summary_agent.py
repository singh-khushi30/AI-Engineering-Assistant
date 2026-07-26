"""Summary Agent — executive synthesis of specialized review outputs."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from agents.base_agent import AgentResult
from agents.intelligence.findings import extract_findings_by_category, extract_review_block
from agents.intelligence.schemas import SummaryInsight
from agents.prompts.loader import load_prompt
from agents.review.base_review_agent import BaseReviewAgent, ReviewAgentError
from agents.review.json_utils import extract_json_object
from app.services.exceptions import InvalidLLMResponseError
from app.services.llm_service import LLMMessage

logger = logging.getLogger(__name__)


class SummaryAgent(BaseReviewAgent):
    """Consume aggregated review-agent outputs and produce an executive summary."""

    name = "summary_agent"
    prompt_namespace = "summary_agent"
    max_output_tokens = 4096

    def validate_context(self, context: dict[str, Any]) -> None:
        super().validate_context(context)
        if "aggregated_review" not in context:
            raise ReviewAgentError(
                "SummaryAgent requires context['aggregated_review'] "
                "(AggregatedReview.to_dict())."
            )

    def build_tool_payload(self, context: dict[str, Any]) -> dict[str, Any]:
        aggregated = context["aggregated_review"]
        if hasattr(aggregated, "to_dict"):
            aggregated = aggregated.to_dict()
        if not isinstance(aggregated, dict):
            raise ReviewAgentError("aggregated_review must be a dictionary.")

        by_category = extract_findings_by_category(aggregated)
        agent_summaries: dict[str, Any] = {}
        for category in ("security", "style", "testing", "architecture"):
            review = extract_review_block(aggregated.get(category))
            payload = aggregated.get(category) if isinstance(aggregated.get(category), dict) else {}
            agent_summaries[category] = {
                "success": payload.get("success"),
                "summary": review.get("summary"),
                "severity": review.get("severity"),
                "recommendations": review.get("recommendations", []),
                "finding_count": len(by_category.get(category, [])),
            }

        return {
            "project_path": aggregated.get("project_path"),
            "agent_summaries": agent_summaries,
            "findings_by_category": by_category,
            "errors": aggregated.get("errors", []),
        }

    def build_messages(self, context: dict[str, Any]) -> list[LLMMessage]:
        payload = self.build_tool_payload(context)
        payload_json = json.dumps(payload, indent=2, default=str)
        system_prompt = load_prompt(self.prompt_namespace, "system")
        task_prompt = load_prompt(self.prompt_namespace, "task")
        user_prompt = (
            f"{task_prompt}\n\n"
            "## Aggregated Review Inputs\n"
            "```json\n"
            f"{payload_json}\n"
            "```\n"
        )
        logger.info(
            "Prompt created agent=%s system_chars=%s user_chars=%s",
            self.name,
            len(system_prompt),
            len(user_prompt),
        )
        return [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_prompt),
        ]

    def run(self, context: dict[str, Any] | None = None) -> AgentResult:
        started = time.perf_counter()
        context = context or {}
        logger.info("Agent started name=%s", self.name)
        try:
            self.validate_context(context)
            messages = self.build_messages(context)
            logger.info("LLM request agent=%s", self.name)
            llm_result = self.llm_service.complete(
                messages,
                max_tokens=self.max_output_tokens,
            )
            elapsed = time.perf_counter() - started
            if not llm_result.success:
                logger.error("Summary generation failed errors=%s", llm_result.errors)
                return AgentResult(
                    success=False,
                    agent=self.name,
                    execution_time=round(elapsed, 3),
                    data={"llm": llm_result.to_dict()},
                    errors=llm_result.errors,
                )

            content = str(llm_result.data.get("content", ""))
            insight = self._parse_insight(content)
            logger.info(
                "Response received agent=%s execution_time=%.3fs",
                self.name,
                elapsed,
            )
            return AgentResult(
                success=True,
                agent=self.name,
                execution_time=round(elapsed, 3),
                data={
                    "summary_insight": insight.to_dict(),
                    "llm": {
                        "model": llm_result.data.get("model"),
                        "provider": llm_result.data.get("provider"),
                        "usage": llm_result.data.get("usage"),
                        "raw_content": content,
                    },
                },
            )
        except ReviewAgentError as exc:
            elapsed = time.perf_counter() - started
            return AgentResult(
                success=False,
                agent=self.name,
                execution_time=round(elapsed, 3),
                data={"details": exc.details},
                errors=[exc.message],
            )
        except InvalidLLMResponseError as exc:
            elapsed = time.perf_counter() - started
            return AgentResult(
                success=False,
                agent=self.name,
                execution_time=round(elapsed, 3),
                data={"error": exc.to_dict()},
                errors=[exc.message],
            )
        except Exception as exc:  # noqa: BLE001
            elapsed = time.perf_counter() - started
            logger.exception("Summary agent error")
            return AgentResult(
                success=False,
                agent=self.name,
                execution_time=round(elapsed, 3),
                errors=[f"Agent error: {exc}"],
            )

    def parse_summary(self, agent_result: AgentResult) -> SummaryInsight:
        if not agent_result.success:
            errors = agent_result.errors or ["Summary agent failed"]
            return SummaryInsight(
                executive_summary=f"Summary unavailable: {errors[0]}",
                confidence=0.0,
            )
        payload = agent_result.data.get("summary_insight")
        if isinstance(payload, dict):
            return SummaryInsight.model_validate(payload)
        raw = str(agent_result.data.get("llm", {}).get("raw_content") or "")
        return self._parse_insight(raw)

    def _parse_insight(self, content: str) -> SummaryInsight:
        try:
            payload = extract_json_object(content)
        except InvalidLLMResponseError as exc:
            raise InvalidLLMResponseError(exc.message, details=exc.details) from exc

        recommendations = []
        for item in payload.get("recommendations", []):
            if isinstance(item, dict):
                recommendations.append(
                    {
                        "title": str(item.get("title") or item.get("recommendation") or "Recommendation"),
                        "rationale": str(item.get("rationale") or item.get("why") or item.get("title") or ""),
                        "tier": str(item.get("tier") or "recommended"),
                        "category": item.get("category"),
                        "severity": item.get("severity"),
                    }
                )
            else:
                recommendations.append(
                    {
                        "title": str(item),
                        "rationale": str(item),
                        "tier": "recommended",
                    }
                )

        return SummaryInsight(
            executive_summary=str(
                payload.get("executive_summary") or payload.get("summary") or ""
            ),
            themes=[str(theme) for theme in payload.get("themes", [])],
            prioritized_issues=[
                item
                for item in payload.get("prioritized_issues", payload.get("findings", []))
                if isinstance(item, dict)
            ],
            grouped_issues=[
                item for item in payload.get("grouped_issues", []) if isinstance(item, dict)
            ],
            recommendations=recommendations,
            confidence=float(payload.get("confidence") or 0.5),
        )
