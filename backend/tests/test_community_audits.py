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
    }, "language": "en", "model_id": "gemini-3.5-flash-lite"}
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


def test_mixed_old_and_spot_checked_observations_round_trip(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "mixed_audit.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    stamp = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    records = [
        {"kind": "trash", "at": stamp},  # legacy entries are still valid
        {"kind": "recycle", "at": stamp, "item_type": "drink_bottle"},
        {"kind": "trash", "at": stamp, "item_type": "paper_plate",
         "sorting_check": "matches", "rules_checked": True},
        {"kind": "recycle", "at": stamp, "item_type": "plastic_cutlery",
         "sorting_check": "mismatch", "rules_checked": True},
    ]
    with TestClient(app) as client:
        assert signup(client, "Volunteer", "spotcheck@example.net").status_code == 200
        saved = client.post("/api/audits", headers=HEADERS,
                            json={"title": "Lunch pilot", "entries": records})
        assert saved.status_code == 201, saved.text
        data = saved.json()
        assert data["item_count"] == 4
        assert data["counts"]["recycle"] == 2
        assert data["counts"]["trash"] == 2
        item = client.get(f"/api/audits/{data['id']}").json()["audit"]
        assert item["entries"] == records
        assert len(client.get("/api/audits").json()["audits"]) == 1


def test_spot_checks_reject_unchecked_or_unknown_destination(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "invalid_spotcheck.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    stamp = (datetime.now(timezone.utc) - timedelta(minutes=3)).isoformat()
    valid = {"kind": "recycle", "at": stamp, "item_type": "drink_bottle",
             "sorting_check": "matches", "rules_checked": True}
    invalid = [
        {**valid, "rules_checked": False},
        {**valid, "rules_checked": True, "item_type": None},
        {**valid, "kind": "unsure"},
        {**valid, "kind": "reuse"},
        {**valid, "sorting_check": "certified"},
        {**valid, "item_type": "fictional_object"},
        {**valid, "sorting_check": None, "rules_checked": True},
    ]
    with TestClient(app) as client:
        assert signup(client, "Volunteer", "spotcheckbad@example.net").status_code == 200
        for entry in invalid:
            response = client.post("/api/audits", headers=HEADERS,
                                   json={"title": "Invalid", "entries": [entry]})
            assert response.status_code == 422, (entry, response.text)


def test_audit_spot_checks_do_not_turn_into_ai_impact_claims(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "audit_privacy.sqlite3"))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    with TestClient(app) as client:
        assert signup(client, "Volunteer", "spotcheckadvice@example.net").status_code == 200
        payload = {"title": "Cafeteria", "counts": {"trash": 2, "recycle": 1},
                   "language": "en"}
        result = client.post("/api/audits/suggestions", headers=HEADERS, json=payload)
        assert result.status_code == 200
        assert result.json()["source"] == "practical"
        assert "verified" not in " ".join(result.json()["suggestions"]).lower()

def test_audit_suggestion_default_model_is_flash_lite():
    from app.community_audits import AuditSuggestions
    payload = AuditSuggestions(title="Lunch", counts={"trash": 2})
    assert payload.model_id == "gemini-3.5-flash-lite"


def test_kiosk_audit_context_is_saved_without_breaking_existing_records(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "kiosk_context.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    stamp = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    with TestClient(app) as client:
        assert signup(client, "Auditor", "context-audit@example.net").status_code == 200
        new = client.post("/api/audits", headers=HEADERS, json={
            "title": "Cafeteria Count",
            "location": "School cafeteria",
            "session": "Lunch A",
            "entries": [{"kind": "trash", "at": stamp, "item_type": "paper_plate"}],
        })
        assert new.status_code == 201, new.text
        audit_id = new.json()["id"]
        assert new.json()["context"] == {"location": "School cafeteria", "session": "Lunch A"}
        listing = client.get("/api/audits").json()["audits"][0]
        assert listing["context"] == {"location": "School cafeteria", "session": "Lunch A"}
        opened = client.get(f"/api/audits/{audit_id}").json()["audit"]
        assert opened["context"] == listing["context"]
        assert opened["entries"] == [{"kind": "trash", "at": stamp, "item_type": "paper_plate"}]
        # The old payload shape still saves; no context fields are required.
        old = client.post("/api/audits", headers=HEADERS, json={
            "title": "Legacy session", "entries": [{"kind": "recycle", "at": stamp}]
        })
        assert old.status_code == 201, old.text
        assert old.json()["context"] == {"location": "", "session": ""}


def test_kiosk_audit_rejects_oversized_context(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "bad_kiosk_context.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    stamp = (datetime.now(timezone.utc) - timedelta(minutes=3)).isoformat()
    with TestClient(app) as client:
        assert signup(client, "Auditor", "context-invalid@example.net").status_code == 200
        for field, length in (("location", 81), ("session", 61)):
            response = client.post("/api/audits", headers=HEADERS, json={
                "title": "Test",
                field: "x" * length,
                "entries": [{"kind": "trash", "at": stamp}],
            })
            assert response.status_code == 422, response.text


def test_legacy_audit_table_migrates_without_deleting_saved_observations(tmp_path, monkeypatch):
    import sqlite3
    from app.accounts import initialize, database

    path = tmp_path / "legacy_context.sqlite3"
    monkeypatch.setenv("WASTELENS_DB", str(path))
    with sqlite3.connect(path) as db:
        db.execute("""
            CREATE TABLE community_audits (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              entries_json TEXT NOT NULL,
              counts_json TEXT NOT NULL,
              item_count INTEGER NOT NULL,
              created_at TEXT NOT NULL
            )
        """)
        db.execute(
            "INSERT INTO community_audits(user_id,title,entries_json,counts_json,item_count,created_at)"
            " VALUES (?,?,?,?,?,?)",
            (123, "Old sample", '[{"kind":"trash","at":"2026-10-20T15:00:00+00:00"}]',
             '{"recycle":0,"compost":0,"trash":1,"reuse":0,"unsure":0}', 1,
             "2026-10-20T15:10:00+00:00")
        )
    initialize()
    with database() as db:
        row = db.execute("SELECT title,entries_json,context_json FROM community_audits WHERE id=1").fetchone()
        assert row["title"] == "Old sample"
        assert '"trash"' in row["entries_json"]
        assert row["context_json"] == "{}"
