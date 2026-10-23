"""Update-in-place audit regression checks: no duplicate records or cross-account updates."""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from app.main import app

HEADERS = {"X-WasteLens-Request": "1"}


def signup(client, email):
    return client.post("/api/auth/signup", headers=HEADERS, json={
        "name": "Audit tester", "email": email, "password": "safe-password-9876"
    })


def payload(title, kinds=("recycle", "trash")):
    timestamp = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    return {"title": title, "entries": [{"kind": k, "at": timestamp} for k in kinds]}


def test_updating_saved_audit_changes_same_record_and_preserves_creation_date(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "audit_update.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    with TestClient(app) as client:
        assert signup(client, "audit-update@example.net").status_code == 200
        created = client.post("/api/audits", headers=HEADERS, json=payload("First title"))
        assert created.status_code == 201, created.text
        audit_id = created.json()["id"]
        initial = client.get("/api/audits").json()["audits"][0]
        for index in range(3):
            new_data = payload(f"Edited {index}", ("compost", "recycle", "reuse"))
            response = client.put(f"/api/audits/{audit_id}", headers=HEADERS, json=new_data)
            assert response.status_code == 200, response.text
            assert response.json()["id"] == audit_id
            assert response.json()["item_count"] == 3
            listing = client.get("/api/audits").json()["audits"]
            assert len(listing) == 1
            assert listing[0]["id"] == audit_id
            assert listing[0]["title"] == new_data["title"]
            assert listing[0]["counts"]["compost"] == 1
            assert listing[0]["created_at"] == initial["created_at"]
        loaded = client.get(f"/api/audits/{audit_id}").json()["audit"]
        assert loaded["title"] == "Edited 2"
        assert len(loaded["entries"]) == 3


def test_update_requires_session_ownership_and_valid_entries(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "audit_secure_update.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    with TestClient(app) as client:
        assert signup(client, "owner-audit@example.net").status_code == 200
        created = client.post("/api/audits", headers=HEADERS, json=payload("Owner audit"))
        audit_id = created.json()["id"]
        endpoint = f"/api/audits/{audit_id}"
        assert client.put(endpoint, json=payload("No origin header")).status_code == 403
        assert client.put(endpoint, headers=HEADERS, json={"title": "Empty", "entries":[]}).status_code == 422
        future = (datetime.now(timezone.utc)+timedelta(days=1)).isoformat()
        assert client.put(endpoint, headers=HEADERS, json={"title":"Future", "entries":[{"kind":"trash", "at":future}]}).status_code == 422
        stamp = (datetime.now(timezone.utc)-timedelta(minutes=5)).isoformat()
        invalid = {"title":"Invalid review", "entries":[{
            "kind":"trash","at":stamp,"item_type":"plastic_cutlery",
            "rules_checked":False,"sorting_check":"mismatch"}]}
        assert client.put(endpoint, headers=HEADERS, json=invalid).status_code == 422
        assert client.get(endpoint).json()["audit"]["title"] == "Owner audit"
        assert client.post("/api/auth/logout", headers=HEADERS).status_code == 200
        assert client.put(endpoint, headers=HEADERS, json=payload("Guest")).status_code == 401
        assert signup(client, "other-audit@example.net").status_code == 200
        assert client.put(endpoint, headers=HEADERS, json=payload("Stolen")).status_code == 404
        assert client.get("/api/audits").json()["audits"] == []
        assert client.post("/api/auth/logout", headers=HEADERS).status_code == 200
        assert client.post("/api/auth/login", headers=HEADERS, json={
            "email":"owner-audit@example.net","password":"safe-password-9876"
        }).status_code == 200
        assert client.get(endpoint).json()["audit"]["title"] == "Owner audit"
        assert client.delete(endpoint, headers=HEADERS).status_code == 200
        assert client.put(endpoint, headers=HEADERS, json=payload("Deleted")).status_code == 404
        assert client.get("/api/audits").json()["audits"] == []


def test_update_accepts_checked_observations_as_before(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "audit_review_update.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    with TestClient(app) as client:
        assert signup(client, "audit-spot-update@example.net").status_code == 200
        created = client.post("/api/audits", headers=HEADERS, json=payload("Old"))
        stamp = (datetime.now(timezone.utc)-timedelta(minutes=10)).isoformat()
        entries = [
            {"kind":"recycle","at":stamp,"item_type":"plastic_cutlery","sorting_check":"mismatch","rules_checked":True},
            {"kind":"trash","at":stamp}
        ]
        result = client.put(f"/api/audits/{created.json()['id']}",headers=HEADERS,
                            json={"title":"Rechecked","entries":entries})
        assert result.status_code == 200, result.text
        assert client.get(f"/api/audits/{created.json()['id']}").json()["audit"]["entries"] == entries
        assert len(client.get("/api/audits").json()["audits"]) == 1
