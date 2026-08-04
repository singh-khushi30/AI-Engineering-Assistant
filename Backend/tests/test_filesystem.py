"""Tests for local filesystem browse endpoints."""

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_filesystem_home() -> None:
    response = client.get("/filesystem/home")
    assert response.status_code == 200
    payload = response.json()
    assert payload["home"]
    assert isinstance(payload["roots"], list)
    assert any(root["name"] == "Home" for root in payload["roots"])


def test_filesystem_browse_default_home() -> None:
    response = client.get("/filesystem/browse")
    assert response.status_code == 200
    payload = response.json()
    assert payload["path"] == str(Path.home().resolve())
    assert payload["home"] == str(Path.home().resolve())
    assert isinstance(payload["entries"], list)


def test_filesystem_browse_existing_path(tmp_path: Path) -> None:
    child = tmp_path / "repo"
    child.mkdir()
    response = client.get("/filesystem/browse", params={"path": str(tmp_path)})
    assert response.status_code == 200
    payload = response.json()
    assert payload["path"] == str(tmp_path.resolve())
    names = {entry["name"] for entry in payload["entries"]}
    assert "repo" in names


def test_filesystem_browse_missing_path() -> None:
    response = client.get(
        "/filesystem/browse",
        params={"path": "/this/path/definitely/does/not/exist-xyz"},
    )
    assert response.status_code == 404
