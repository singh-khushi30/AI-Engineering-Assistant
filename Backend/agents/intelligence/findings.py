"""Helpers to extract findings from aggregated review-agent payloads."""

from __future__ import annotations

from typing import Any


CATEGORY_KEYS = ("security", "style", "testing", "architecture")


def extract_review_block(agent_payload: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(agent_payload, dict):
        return {}
    data = agent_payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("review"), dict):
        return data["review"]
    if "summary" in agent_payload and "findings" in agent_payload:
        return agent_payload
    return {}


def extract_findings_by_category(
    aggregated: dict[str, Any],
) -> dict[str, list[dict[str, Any]]]:
    by_category: dict[str, list[dict[str, Any]]] = {key: [] for key in CATEGORY_KEYS}
    for category in CATEGORY_KEYS:
        review = extract_review_block(aggregated.get(category))
        findings = review.get("findings") if isinstance(review.get("findings"), list) else []
        for item in findings:
            if isinstance(item, dict):
                finding = dict(item)
                finding.setdefault("category", category)
                finding["_source_agent"] = category
                by_category[category].append(finding)
            elif isinstance(item, str):
                by_category[category].append(
                    {
                        "title": item,
                        "detail": item,
                        "severity": "info",
                        "category": category,
                        "_source_agent": category,
                    }
                )
    return by_category


def flatten_findings(by_category: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for category_findings in by_category.values():
        items.extend(category_findings)
    return items


_SEVERITY_RANK = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
    "info": 4,
    "none": 5,
}


def sort_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        findings,
        key=lambda item: (
            _SEVERITY_RANK.get(str(item.get("severity", "info")).lower(), 4),
            str(item.get("title") or ""),
        ),
    )


def dedupe_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for finding in findings:
        key = "|".join(
            [
                str(finding.get("title") or "").strip().lower(),
                str(finding.get("file") or "").strip().lower(),
                str(finding.get("line") or ""),
                str(finding.get("category") or finding.get("_source_agent") or ""),
            ]
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(finding)
    return unique
