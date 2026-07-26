"""Export ReportDocument artifacts through isolated formatters."""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

from reports.formatters.base import ReportFormatter
from reports.formatters.html_formatter import HtmlReportFormatter
from reports.formatters.json_formatter import JsonReportFormatter
from reports.formatters.markdown_formatter import MarkdownReportFormatter
from reports.schemas import ReportDocument

logger = logging.getLogger(__name__)


class ReportExporter:
    """Write JSON/Markdown/HTML reports; isolate formatter failures."""

    def __init__(self, output_dir: str | Path) -> None:
        self.output_dir = Path(output_dir)
        self.formatters: list[ReportFormatter] = [
            JsonReportFormatter(),
            MarkdownReportFormatter(),
            HtmlReportFormatter(),
        ]

    def export_all(
        self,
        document: ReportDocument,
        *,
        stem: str | None = None,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        logger.info("Formatting reports output_dir=%s", self.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        file_stem = stem or f"{document.metadata.project_name}-review"
        artifacts: dict[str, str | None] = {}
        errors: list[str] = []

        for formatter in self.formatters:
            target = self.output_dir / f"{file_stem}.{formatter.extension}"
            try:
                logger.info("Formatting %s → %s", formatter.name, target)
                formatter.write(document, target)
                artifacts[formatter.name] = str(target)
            except Exception as exc:  # noqa: BLE001 - isolate formatter failures
                message = f"{formatter.name} formatter failed: {exc}"
                logger.exception(message)
                errors.append(message)
                artifacts[formatter.name] = None

        elapsed = round(time.perf_counter() - started, 3)
        logger.info("Report formatting finished execution_time=%.3fs", elapsed)
        return {
            "artifacts": artifacts,
            "errors": errors,
            "execution_time": elapsed,
            "output_dir": str(self.output_dir.resolve()),
        }
