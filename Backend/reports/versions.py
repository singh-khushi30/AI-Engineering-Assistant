"""Version metadata for reports."""

from __future__ import annotations

from importlib import metadata


AGENT_VERSIONS = {
    "security_review_agent": "1.3B",
    "style_review_agent": "1.3B",
    "testing_review_agent": "1.3B",
    "architecture_review_agent": "1.3B",
    "summary_agent": "1.3D",
    "review_orchestrator": "1.3C",
    "review_intelligence": "1.3D",
}

TOOL_PACKAGES = {
    "pytest": "pytest",
    "coverage": "coverage",
    "ruff": "ruff",
    "bandit": "bandit",
}


def resolve_tool_versions() -> dict[str, str]:
    versions: dict[str, str] = {"git": "system"}
    for label, package in TOOL_PACKAGES.items():
        try:
            versions[label] = metadata.version(package)
        except metadata.PackageNotFoundError:
            versions[label] = "unknown"
    return versions
