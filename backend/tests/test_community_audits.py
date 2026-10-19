"""Saved audits are private, observable counts; AI guidance must be bounded."""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.main import app


HEADERS = {"X-WasteLens-Request": "1"}


def signup(client, name, email):
    return client.post("/api/auth/signup", headers=HEADERS,
                       json={"name": name, "email": email, "password": "safe-password-9876"})


def sample(label="School lunch", count=3):
    stamp = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    return {"title": label, "entries": [
        {"kind": kind, "at": stamp}
        for kind in (["trash", "recycle", "reuse"] * count)
    ]}


def test_audits_are_saved_privately_and_can_be_opened_deleted(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "audits.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    with TestClient(app) as client:
        assert client.get("/api/audits").status_code == 401
        assert client.post("/api/audits", headers=HEADERS, json=sample()).status_code == 401
        assert signup(client, "Volunteer 1", "volunteer1@example.net").status_code == 200
        assert client.post("/api/audits", json=sample()).status_code == 403
        created = client.post("/api/audits", headers=HEADERS, json=sample())
        assert created.status_code == 201, created.text
        item_id = created.json()["id"]
        assert created.json()["item_count"] == 9
        assert created.json()["counts"] == {
            "recycle": 3, "compost": 0, "trash": 3, "reuse": 3, "unsure": 0
        }
        listing = client.get("/api/audits")
        assert listing.status_code == 200
        assert len(listing.json()["audits"]) == 1
        loaded = client.get(f"/api/audits/{item_id}").json()["audit"]
        assert loaded["title"] == "School lunch"
        assert len(loaded["entries"]) == 9

        assert client.post("/api/auth/logout", headers=HEADERS).status_code == 200
        assert signup(client, "Volunteer 2", "volunteer2@example.net").status_code == 200
        assert client.get("/api/audits").json()["audits"] == []
        assert client.get(f"/api/audits/{item_id}").status_code == 404
        assert client.delete(f"/api/audits/{item_id}", headers=HEADERS).status_code == 404
        assert client.post("/api/auth/logout", headers=HEADERS).status_code == 200
        assert client.post("/api/auth/login", headers=HEADERS,
                           json={"email": "volunteer1@example.net", "password": "safe-password-9876"}
                          ).status_code == 200
        assert client.delete(f"/api/audits/{item_id}").status_code == 403
        assert client.delete(f"/api/audits/{item_id}", headers=HEADERS).status_code == 200
        assert client.get("/api/audits").json()["audits"] == []


def test_audits_reject_empty_future_or_oversized_entries(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "bad_audits.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    with TestClient(app) as client:
        assert signup(client, "Volunteer", "safeaudit@example.net").status_code == 200
        assert client.post("/api/audits", headers=HEADERS,
                           json={"title": "Empty", "entries": []}).status_code == 422
        future = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        assert client.post("/api/audits", headers=HEADERS, json={
            "title": "Future", "entries": [{"kind": "trash", "at": future}]
        }).status_code == 422
        assert client.post("/api/audits", headers=HEADERS, json={
            "title": "Wrong", "entries": [{"kind": "hazard", "at": future}]
        }).status_code == 422
        assert client.post("/api/audits", headers=HEADERS,
                           json=sample("a" * 61)).status_code == 422


def test_ai_suggestions_require_login_and_do_not_invent_impact(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "audit_advice.sqlite3"))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    payload = {"title": "School lunch", "counts": {
        "recycle": 4, "trash": 13, "reuse": 1, "compost": 0, "unsure": 7
    }, "language": "en", "model_id": "gemini-3.8-flash"}
    with TestClient(app) as client:
        assert client.post("/api/audits/suggestions", headers=HEADERS, json=payload).status_code == 401
        assert signup(client, "Volunteer", "auditideas@example.net").status_code == 200
        assert client.post("/api/audits/suggestions", json=payload).status_code == 403
        result = client.post("/api/audits/suggestions", headers=HEADERS, json=payload)
        assert result.status_code == 200, result.text
        data = result.json()
        assert data["source"] == "practical"
        assert len(data["suggestions"]) == 3
        assert "trash" in data["suggestions"][0].lower()
        assert "carbon" not in " ".join(data["suggestions"]).lower()
        invalid = {**payload, "counts": {"trash": -1}}
        assert client.post("/api/audits/suggestions", headers=HEADERS,json=invalid).status_code == 422
        invalid = {**payload, "counts": {"trash": 0}}
        assert client.post("/api/audits/suggestions", headers=HEADERS,json=invalid).status_code == 422
