"""Lightweight JSON file persistence for review jobs.

Layout::

    Backend/data/reviews/
      index.json
      <review_id>.json

No database — suitable for local development.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

INDEX_VERSION = 1
_WRITE_LOCK = threading.Lock()


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def resolve_reviews_data_dir(explicit: str | Path | None = None) -> Path:
    """Resolve the reviews data directory under the Backend package root by default."""
    if explicit is not None:
        path = Path(explicit).expanduser()
    else:
        settings = get_settings()
        configured = getattr(settings, "reviews_data_dir", None) or "data/reviews"
        path = Path(str(configured)).expanduser()

    if not path.is_absolute():
        backend_root = Path(__file__).resolve().parents[2]
        path = backend_root / path
    return path.resolve()


def resolve_reports_dir() -> Path:
    """Resolve reports output dir relative to Backend package root by default."""
    settings = get_settings()
    path = Path(settings.reports_dir).expanduser()
    if not path.is_absolute():
        backend_root = Path(__file__).resolve().parents[2]
        path = backend_root / path
    return path.resolve()


class ReviewPersistence:
    """Save and restore completed/failed review records as JSON files."""

    def __init__(self, data_dir: str | Path | None = None) -> None:
        self.data_dir = resolve_reviews_data_dir(data_dir)
        self.index_path = self.data_dir / "index.json"

    def ensure_dirs(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def review_path(self, review_id: str) -> Path:
        safe = re.sub(r"[^a-zA-Z0-9._-]", "_", review_id)
        return self.data_dir / f"{safe}.json"

    def load_index(self) -> dict[str, Any]:
        self.ensure_dirs()
        if not self.index_path.exists():
            return {"version": INDEX_VERSION, "items": []}
        try:
            payload = json.loads(self.index_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Failed to read review index: %s", exc)
            return {"version": INDEX_VERSION, "items": []}
        if not isinstance(payload, dict):
            return {"version": INDEX_VERSION, "items": []}
        items = payload.get("items")
        if not isinstance(items, list):
            items = []
        return {"version": INDEX_VERSION, "items": items}

    def save_index(self, items: list[dict[str, Any]]) -> None:
        self.ensure_dirs()
        payload = {"version": INDEX_VERSION, "items": items, "updated_at": _utcnow_iso()}
        tmp = self.index_path.with_suffix(".tmp")
        with _WRITE_LOCK:
            tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
            tmp.replace(self.index_path)

    def load_review(self, review_id: str) -> dict[str, Any] | None:
        path = self.review_path(review_id)
        if not path.exists():
            # Fallback: scan for exact id field if filename was sanitized differently.
            for candidate in self.data_dir.glob("*.json"):
                if candidate.name == "index.json":
                    continue
                try:
                    payload = json.loads(candidate.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    continue
                if isinstance(payload, dict) and payload.get("id") == review_id:
                    return payload
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Failed to read review %s: %s", review_id, exc)
            return None
        return payload if isinstance(payload, dict) else None

    def list_review_records(self) -> list[dict[str, Any]]:
        """Load full persisted records (completed/failed/cancelled)."""
        self.ensure_dirs()
        records: list[dict[str, Any]] = []
        for path in sorted(self.data_dir.glob("*.json")):
            if path.name == "index.json":
                continue
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                logger.warning("Skipping corrupt review file %s: %s", path, exc)
                continue
            if isinstance(payload, dict) and payload.get("id"):
                records.append(payload)
        return records

    def save_review(self, record: dict[str, Any]) -> Path:
        """Persist one review record and refresh index entry."""
        review_id = str(record.get("id") or "").strip()
        if not review_id:
            raise ValueError("review record requires id")

        self.ensure_dirs()
        record = dict(record)
        record["persisted_at"] = _utcnow_iso()
        path = self.review_path(review_id)
        tmp = path.with_suffix(".tmp")
        serialized = json.dumps(record, indent=2, default=str)

        with _WRITE_LOCK:
            tmp.write_text(serialized, encoding="utf-8")
            tmp.replace(path)

            index = self.load_index()
            items = [
                item
                for item in index.get("items", [])
                if isinstance(item, dict) and item.get("id") != review_id
            ]
            items.append(self._summary_from_record(record))
            items.sort(
                key=lambda item: str(item.get("created_at") or ""),
                reverse=True,
            )
            # write index without re-entering lock via save_index
            payload = {
                "version": INDEX_VERSION,
                "items": items,
                "updated_at": _utcnow_iso(),
            }
            index_tmp = self.index_path.with_suffix(".tmp")
            index_tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
            index_tmp.replace(self.index_path)

        logger.info("Persisted review id=%s status=%s path=%s", review_id, record.get("status"), path)
        return path

    def rebuild_index(self) -> list[dict[str, Any]]:
        records = self.list_review_records()
        items = [self._summary_from_record(record) for record in records]
        items.sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
        self.save_index(items)
        return items

    def import_legacy_report_files(self, reports_dir: str | Path | None = None) -> int:
        """Import ReportDocument JSON files from the reports output directory.

        CLI/API report JSON does not include a review UUID, so we derive a stable
        imported-* id from project path + timestamp.
        """
        root = Path(reports_dir) if reports_dir is not None else resolve_reports_dir()
        if not root.exists():
            return 0

        existing_ids = {str(r.get("id")) for r in self.list_review_records()}
        existing_sources = {
            str(r.get("source_report") or "")
            for r in self.list_review_records()
            if r.get("source_report")
        }
        imported = 0
        for path in sorted(root.glob("*-review.json")):
            try:
                report = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                logger.warning("Skipping unreadable report %s: %s", path, exc)
                continue
            if not isinstance(report, dict) or "metadata" not in report:
                continue

            abs_path = str(path.resolve())
            if abs_path in existing_sources:
                continue

            record = report_document_to_persisted_record(report, source_report=abs_path)
            if record["id"] in existing_ids:
                continue

            self.save_review(record)
            existing_ids.add(record["id"])
            existing_sources.add(abs_path)
            imported += 1
            logger.info("Imported legacy report %s as review %s", path.name, record["id"])

        return imported

    @staticmethod
    def _summary_from_record(record: dict[str, Any]) -> dict[str, Any]:
        result = record.get("result") if isinstance(record.get("result"), dict) else {}
        report = result.get("report") if isinstance(result.get("report"), dict) else {}
        if not report and isinstance(result.get("metadata"), dict):
            # Imported raw report document stored under result.report or whole result
            report = result if "metadata" in result else report

        meta = report.get("metadata") if isinstance(report.get("metadata"), dict) else {}
        tools = {}
        aggregated = result.get("aggregated_review") if isinstance(result.get("aggregated_review"), dict) else {}
        if isinstance(aggregated.get("tools"), dict):
            tools = aggregated["tools"]
        else:
            appendix = report.get("appendix") if isinstance(report.get("appendix"), dict) else {}
            if isinstance(appendix.get("tool_results"), dict):
                tools = appendix["tool_results"]

        coverage_data = {}
        if isinstance(tools.get("coverage"), dict):
            coverage_data = tools["coverage"].get("data") or {}
        pytest_data = {}
        if isinstance(tools.get("pytest"), dict):
            pytest_data = tools["pytest"].get("data") or {}

        coverage = None
        if isinstance(coverage_data.get("percent_covered"), (int, float)):
            coverage = float(coverage_data["percent_covered"])
        elif isinstance(coverage_data.get("total_coverage"), (int, float)):
            coverage = float(coverage_data["total_coverage"])

        priority = report.get("priority_distribution") if isinstance(report.get("priority_distribution"), dict) else {}
        duration = record.get("duration_seconds")
        if duration is None:
            duration = meta.get("execution_duration")

        return {
            "id": record.get("id"),
            "project_name": record.get("project_name") or meta.get("project_name") or "project",
            "project_path": record.get("project_path") or meta.get("project_path") or "",
            "provider": record.get("provider") or meta.get("provider") or "unknown",
            "status": record.get("status") or "completed",
            "coverage_percent": coverage,
            "tests_passed": pytest_data.get("passed") if isinstance(pytest_data.get("passed"), int) else None,
            "tests_failed": pytest_data.get("failed") if isinstance(pytest_data.get("failed"), int) else None,
            "high_count": priority.get("high") if isinstance(priority.get("high"), int) else None,
            "medium_count": priority.get("medium") if isinstance(priority.get("medium"), int) else None,
            "low_count": priority.get("low") if isinstance(priority.get("low"), int) else None,
            "duration_seconds": float(duration) if isinstance(duration, (int, float)) else None,
            "created_at": record.get("created_at") or meta.get("timestamp"),
            "completed_at": record.get("completed_at") or meta.get("timestamp"),
            "error": record.get("error"),
        }


def stable_imported_review_id(*, project_path: str, timestamp: str, source_report: str) -> str:
    digest = hashlib.sha1(
        f"{project_path}|{timestamp}|{source_report}".encode("utf-8")
    ).hexdigest()[:12]
    return f"imported-{digest}"


def report_document_to_persisted_record(
    report: dict[str, Any],
    *,
    source_report: str,
) -> dict[str, Any]:
    """Convert a ReportDocument JSON blob into an API-compatible persisted record."""
    meta = report.get("metadata") if isinstance(report.get("metadata"), dict) else {}
    project_name = str(meta.get("project_name") or Path(source_report).stem.replace("-review", "") or "project")
    project_path = str(meta.get("project_path") or "")
    provider = str(meta.get("provider") or "unknown")
    timestamp = str(meta.get("timestamp") or _utcnow_iso())
    review_id = stable_imported_review_id(
        project_path=project_path,
        timestamp=timestamp,
        source_report=source_report,
    )

    appendix = report.get("appendix") if isinstance(report.get("appendix"), dict) else {}
    tool_results = appendix.get("tool_results") if isinstance(appendix.get("tool_results"), dict) else {}
    agent_results = appendix.get("agent_results") if isinstance(appendix.get("agent_results"), dict) else {}
    detailed = report.get("detailed_findings") if isinstance(report.get("detailed_findings"), dict) else {}

    def _agent(key: str) -> Any:
        return agent_results.get(key) if key in agent_results else detailed.get(key)

    aggregated = {
        "success": True,
        "project_path": project_path,
        "execution_time": meta.get("execution_duration"),
        "tools": tool_results,
        "security": _agent("security"),
        "style": _agent("style"),
        "testing": _agent("testing"),
        "architecture": _agent("architecture"),
        "crew": appendix.get("crew") or {},
        "errors": list(report.get("errors") or []),
        "timings": appendix.get("timings") or {},
    }

    artifacts: dict[str, str | None] = {"json": source_report}
    source_path = Path(source_report)
    for ext, name in ((".md", "markdown"), (".html", "html")):
        sibling = source_path.with_suffix(ext)
        artifacts[name] = str(sibling) if sibling.exists() else None

    completed_at = timestamp
    duration = meta.get("execution_duration")
    duration_f = float(duration) if isinstance(duration, (int, float)) else None

    return {
        "id": review_id,
        "status": "completed",
        "project_name": project_name,
        "project_path": project_path,
        "provider": provider,
        "created_at": completed_at,
        "started_at": completed_at,
        "completed_at": completed_at,
        "duration_seconds": duration_f,
        "error": None,
        "failed_stage": None,
        "message": "Imported from saved report",
        "steps": [],
        "request": {
            "project_path": project_path,
            "provider": provider,
            "imported": True,
        },
        "result": {
            "success": True,
            "execution_time": duration_f,
            "aggregated_review": aggregated,
            "intelligence": {
                "summary": {
                    "executive_summary": report.get("executive_summary"),
                    "themes": report.get("themes") or [],
                    "prioritized_issues": report.get("top_issues") or [],
                },
                "intelligence": {
                    "health_scores": {
                        "overall": report.get("overall_health"),
                        **(report.get("category_scores") or {}),
                    },
                    "priority_distribution": report.get("priority_distribution") or {},
                    "category_issue_counts": report.get("category_issue_counts") or {},
                    "top_issues": report.get("top_issues") or [],
                },
                "recommendations": report.get("recommendations") or [],
            },
            "report": report,
            "artifacts": artifacts,
            "errors": list(report.get("errors") or []),
            "output_dir": str(source_path.parent),
        },
        "source": "imported_report",
        "source_report": source_report,
    }


def job_to_persisted_record(
    *,
    review_id: str,
    status: str,
    project_name: str,
    project_path: str,
    provider: str,
    created_at: datetime,
    started_at: datetime | None,
    completed_at: datetime | None,
    duration_seconds: float | None,
    error: str | None,
    failed_stage: str | None,
    message: str | None,
    steps: list[dict[str, Any]],
    request: dict[str, Any],
    result: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "id": review_id,
        "status": status,
        "project_name": project_name,
        "project_path": project_path,
        "provider": provider,
        "created_at": created_at.isoformat(),
        "started_at": started_at.isoformat() if started_at else None,
        "completed_at": completed_at.isoformat() if completed_at else None,
        "duration_seconds": duration_seconds,
        "error": error,
        "failed_stage": failed_stage,
        "message": message,
        "steps": steps,
        "request": request,
        "result": result,
        "source": "api",
    }


def parse_persisted_datetime(value: Any) -> datetime:
    parsed = _parse_dt(value)
    return parsed or datetime.now(timezone.utc)
