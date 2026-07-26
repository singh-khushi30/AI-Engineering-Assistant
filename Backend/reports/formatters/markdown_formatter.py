"""Markdown report formatter."""

from __future__ import annotations

from reports.formatters.base import ReportFormatter
from reports.schemas import ReportDocument


class MarkdownReportFormatter(ReportFormatter):
    name = "markdown"
    extension = "md"

    def render(self, document: ReportDocument) -> str:
        meta = document.metadata
        lines: list[str] = [
            f"# {meta.product_name}",
            "",
            f"**Project:** {meta.project_name}  ",
            f"**Path:** `{meta.project_path}`  ",
            f"**Generated:** {meta.timestamp}  ",
            f"**Duration:** {meta.execution_duration:.2f}s  ",
            f"**Model:** {meta.model_used} ({meta.provider})  ",
            f"**App version:** {meta.app_version}",
            "",
            "## Project Summary",
            "",
            document.executive_summary or "_No executive summary available._",
            "",
            "## Overall Health",
            "",
            f"**Score:** {document.overall_health:.1f} / 10",
            "",
            "## Category Scores",
            "",
        ]
        for key, value in document.category_scores.items():
            lines.append(f"- **{key.title()}:** {value:.1f}")
        lines.extend(["", "## Priority Distribution", ""])
        for key, value in document.priority_distribution.items():
            lines.append(f"- **{key.title()}:** {value}")

        lines.extend(["", "## Top Issues", ""])
        if not document.top_issues:
            lines.append("_No issues reported._")
        else:
            for index, issue in enumerate(document.top_issues, start=1):
                title = issue.get("title") or "Issue"
                severity = issue.get("severity") or "info"
                detail = issue.get("detail") or ""
                lines.append(f"{index}. **[{severity}] {title}** — {detail}")

        lines.extend(["", "## Recommendations", ""])
        if not document.recommendations:
            lines.append("_No recommendations._")
        else:
            for rec in document.recommendations:
                lines.append(
                    f"- **{rec.get('tier', 'recommended')} — {rec.get('title')}**  "
                    f"  \n  Why: {rec.get('rationale')}"
                )

        lines.extend(["", "## Detailed Findings", ""])
        for category, payload in document.detailed_findings.items():
            lines.append(f"### {category.title()}")
            if not payload:
                lines.append("_Missing agent output._")
                lines.append("")
                continue
            review = ((payload or {}).get("data") or {}).get("review") or {}
            lines.append(review.get("summary") or "_No summary._")
            lines.append("")

        lines.extend(
            [
                "## Appendix",
                "",
                f"- Execution time: {document.appendix.get('execution_time')}s",
                f"- Agent versions: `{meta.agent_versions}`",
                f"- Tool versions: `{meta.tool_versions}`",
            ]
        )
        if document.errors:
            lines.extend(["", "### Errors", ""])
            for err in document.errors:
                lines.append(f"- {err}")
        lines.append("")
        return "\n".join(lines)
