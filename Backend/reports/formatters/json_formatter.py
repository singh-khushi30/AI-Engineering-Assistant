"""JSON report formatter."""

from __future__ import annotations

import json

from reports.formatters.base import ReportFormatter
from reports.schemas import ReportDocument


class JsonReportFormatter(ReportFormatter):
    name = "json"
    extension = "json"

    def render(self, document: ReportDocument) -> str:
        return json.dumps(document.to_dict(), indent=2, default=str)
