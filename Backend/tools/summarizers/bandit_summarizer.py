"""Bandit output summarizer — severity/confidence counts + top findings."""

from __future__ import annotations

from collections import Counter
from typing import Any

from tools.summarizers.base import BaseToolSummarizer, severity_rank, truncate_text


class BanditSummarizer(BaseToolSummarizer):
    tool_name = "bandit"

    def _build_summary(
        self,
        tool_result: dict[str, Any],
    ) -> tuple[dict[str, Any], bool, list[str]]:
        data = tool_result.get("data") if isinstance(tool_result.get("data"), dict) else {}
        findings = data.get("findings") if isinstance(data.get("findings"), list) else []
        metrics = data.get("metrics") if isinstance(data.get("metrics"), dict) else {}
        totals = metrics.get("_totals") if isinstance(metrics.get("_totals"), dict) else {}

        severity_counts: Counter[str] = Counter()
        confidence_counts: Counter[str] = Counter()
        for item in findings:
            if not isinstance(item, dict):
                continue
            severity_counts[str(item.get("issue_severity") or "UNDEFINED").upper()] += 1
            confidence_counts[str(item.get("issue_confidence") or "UNDEFINED").upper()] += 1

        # Prefer Bandit totals when present; otherwise derive from findings.
        if totals:
            for key, value in totals.items():
                if key.startswith("SEVERITY.") and isinstance(value, int):
                    severity_counts[key.split(".", 1)[1]] = value
                if key.startswith("CONFIDENCE.") and isinstance(value, int):
                    confidence_counts[key.split(".", 1)[1]] = value

        ranked = sorted(
            [item for item in findings if isinstance(item, dict)],
            key=lambda item: (
                severity_rank(str(item.get("issue_severity"))),
                severity_rank(str(item.get("issue_confidence"))),
                str(item.get("filename") or ""),
            ),
        )
        top_n = self.config.top_n_findings
        truncated = len(ranked) > top_n
        top_findings = []
        for item in ranked[:top_n]:
            top_findings.append(
                {
                    "id": item.get("test_id"),
                    "test": item.get("test_name"),
                    "severity": item.get("issue_severity"),
                    "confidence": item.get("issue_confidence"),
                    "file": item.get("filename"),
                    "line": item.get("line_number"),
                    "issue": item.get("issue_text"),
                    "remediation": item.get("more_info"),
                    "code": truncate_text(
                        item.get("code"),
                        self.config.code_snippet_max_chars,
                    ),
                }
            )

        summary = {
            "finding_count": data.get("finding_count", len(findings)),
            "severity_counts": dict(severity_counts),
            "confidence_counts": dict(confidence_counts),
            "top_findings": top_findings,
            "omitted_findings": max(0, len(findings) - len(top_findings)),
        }
        return summary, truncated, list(tool_result.get("errors") or [])
