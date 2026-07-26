"""HTML report formatter."""

from __future__ import annotations

import html

from reports.formatters.base import ReportFormatter
from reports.schemas import ReportDocument


class HtmlReportFormatter(ReportFormatter):
    name = "html"
    extension = "html"

    def render(self, document: ReportDocument) -> str:
        meta = document.metadata
        esc = html.escape

        score_rows = "".join(
            f"<tr><td>{esc(key.title())}</td><td>{value:.1f}</td></tr>"
            for key, value in document.category_scores.items()
        )
        priority_rows = "".join(
            f"<tr><td>{esc(key.title())}</td><td>{value}</td></tr>"
            for key, value in document.priority_distribution.items()
        )
        issue_items = "".join(
            "<li><strong>[{sev}] {title}</strong> — {detail}</li>".format(
                sev=esc(str(issue.get("severity") or "info")),
                title=esc(str(issue.get("title") or "Issue")),
                detail=esc(str(issue.get("detail") or "")),
            )
            for issue in document.top_issues
        ) or "<li><em>No issues reported.</em></li>"

        rec_items = "".join(
            "<li><strong>{tier} — {title}</strong><br/><em>Why:</em> {why}</li>".format(
                tier=esc(str(rec.get("tier") or "recommended")),
                title=esc(str(rec.get("title") or "")),
                why=esc(str(rec.get("rationale") or "")),
            )
            for rec in document.recommendations
        ) or "<li><em>No recommendations.</em></li>"

        detail_sections = []
        for category, payload in document.detailed_findings.items():
            review = ((payload or {}).get("data") or {}).get("review") or {}
            summary = esc(str(review.get("summary") or "No summary."))
            detail_sections.append(
                f"<h3>{esc(category.title())}</h3><p>{summary}</p>"
            )

        error_block = ""
        if document.errors:
            items = "".join(f"<li>{esc(err)}</li>" for err in document.errors)
            error_block = f"<h2>Errors</h2><ul>{items}</ul>"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{esc(meta.product_name)} — {esc(meta.project_name)}</title>
  <style>
    body {{ font-family: Georgia, serif; margin: 2rem auto; max-width: 920px; color: #1a1a1a; background: #f7f4ef; }}
    h1, h2, h3 {{ font-family: "Helvetica Neue", Arial, sans-serif; }}
    .card {{ background: #fff; border: 1px solid #ddd4c6; padding: 1.25rem 1.5rem; margin-bottom: 1rem; }}
    table {{ border-collapse: collapse; width: 100%; }}
    td, th {{ border-bottom: 1px solid #eee; padding: 0.4rem 0.2rem; text-align: left; }}
    .score {{ font-size: 2rem; font-weight: 700; }}
    code {{ background: #f0ebe3; padding: 0.1rem 0.3rem; }}
  </style>
</head>
<body>
  <h1>{esc(meta.product_name)}</h1>
  <div class="card">
    <p><strong>Project:</strong> {esc(meta.project_name)}<br/>
    <strong>Path:</strong> <code>{esc(meta.project_path)}</code><br/>
    <strong>Generated:</strong> {esc(meta.timestamp)}<br/>
    <strong>Duration:</strong> {meta.execution_duration:.2f}s<br/>
    <strong>Model:</strong> {esc(str(meta.model_used))} ({esc(str(meta.provider))})<br/>
    <strong>App version:</strong> {esc(meta.app_version)}</p>
  </div>

  <div class="card">
    <h2>Project Summary</h2>
    <p>{esc(document.executive_summary or "No executive summary available.")}</p>
  </div>

  <div class="card">
    <h2>Overall Health</h2>
    <p class="score">{document.overall_health:.1f} / 10</p>
  </div>

  <div class="card">
    <h2>Category Scores</h2>
    <table>{score_rows}</table>
  </div>

  <div class="card">
    <h2>Priority Distribution</h2>
    <table>{priority_rows}</table>
  </div>

  <div class="card">
    <h2>Top Issues</h2>
    <ol>{issue_items}</ol>
  </div>

  <div class="card">
    <h2>Recommendations</h2>
    <ul>{rec_items}</ul>
  </div>

  <div class="card">
    <h2>Detailed Findings</h2>
    {''.join(detail_sections)}
  </div>

  <div class="card">
    <h2>Appendix</h2>
    <p>Execution time: {esc(str(document.appendix.get('execution_time')))}s</p>
    <p>Agent versions: <code>{esc(str(meta.agent_versions))}</code></p>
    <p>Tool versions: <code>{esc(str(meta.tool_versions))}</code></p>
    {error_block}
  </div>
</body>
</html>
"""
