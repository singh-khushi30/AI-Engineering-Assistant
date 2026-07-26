"""Formatter interfaces."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from reports.schemas import ReportDocument


class ReportFormatter(ABC):
    """Format a ReportDocument into a concrete artifact."""

    name: str = "base"
    extension: str = "txt"

    @abstractmethod
    def render(self, document: ReportDocument) -> str:
        """Return the formatted report as text."""

    def write(self, document: ReportDocument, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        content = self.render(document)
        output_path.write_text(content, encoding="utf-8")
        return output_path
