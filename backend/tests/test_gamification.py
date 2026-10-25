"""Game logic API tests use local SQLite and mocked vision, no external services."""
import hashlib
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.accounts import record_scan
from app.gamification import xp_for_scan
from app.vision import ItemAnalysis

HEADERS = {"X-WasteLens-Request": "1"}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "gamification.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD", raising=False)
    with TestClient(app) as result:
        yield result


def signup(client, name, email):
    result = client.post("/api/auth/signup", headers=HEADERS, json={
        "name": name, "email": email, "password": "safe-password-12345"
    })
    assert result.status_code == 200, result.text
    return result.json()


def prediction(identification="likely"):
    return ItemAnalysis(
        item_name="Reusable water bottle",
        visual_description="Blue bottle",
        material_guess="Uncertain material",
        identification=identification,
        route="reuse_first",
        route_title="Reuse if possible",
        disposal_steps=["Check local collection guidelines."],
        reuse_ideas=["Keep using it."],
        cautions=[],
        follow_up_question="",
        location_helpful=False,
        collection_search_term="",
    )


def test_xp_only_for_new_likely_photos_and_account_login(client, monkeypatch):
    user = signup(client, "Student One", "studentone@example.org")
    import app.main as main
    monkeypatch.setattr(main, "analyze_photo", lambda *args: prediction())
    def scan(image):
        return client.post("/api/ai/analyze", files={"image": ("bottle.jpg", image, "image/jpeg")})

    first = scan(b"image number 1")
    assert first.status_code == 200
    assert first.json()["earned_xp"] == 20
    assert [badge["name"] for badge in first.json()["unlocked_badges"]] == ["First Find"]
    assert first.json()["scan_id"] is not None

    replay = scan(b"image number 1")
    assert replay.json()["earned_xp"] == 0
    assert replay.json()["unlocked_badges"] == []
    state = client.get("/api/leaderboard").json()
    assert state["leaders"] == []  # private by default
    assert state["me"]["xp"] == 20
    assert state["me"]["scans"] == 2
    assert state["me"]["rewarded_scans"] == 1
    assert state["me"]["badges"][0]["unlocked"] is True
    assert state["me"]["carbon_kg"] is None

    monkeypatch.setattr(main, "analyze_photo", lambda *args: prediction("uncertain"))
    unknown = scan(b"new image but unidentified")
    assert unknown.json()["earned_xp"] == 0
    assert unknown.json()["unlocked_badges"] == []
    assert client.get("/api/leaderboard").json()["me"]["xp"] == 20

    assert client.post("/api/auth/logout",headers=HEADERS).status_code == 200
    assert client.get("/api/leaderboard").json()["me"] is None
    logged_out = scan(b"anonymous scan")
    assert logged_out.json()["scan_id"] is None
    assert logged_out.json()["earned_xp"] == 0
    assert logged_out.json()["unlocked_badges"] == []


def test_badges_levels_and_daily_cap(client):
    person = signup(client, "Scanned A Lot", "scanner@example.org")
    from app.gamification import new_badges_for_scan
    for index in range(11):
        scan_id = record_scan(
            person["id"], "model", prediction().model_dump(),
            photo_digest=hashlib.sha256(("image"+str(index)).encode()).hexdigest()
        )
        assert xp_for_scan(scan_id) == (20 if index < 10 else 0)
        awarded = new_badges_for_scan(scan_id)
        if index in (0,4,9):
            assert [badge["threshold"] for badge in awarded] == [index+1]
        else:
            assert awarded == []
    me = client.get("/api/leaderboard").json()["me"]
    assert me["scans"] == 11
    assert me["xp"] == 200
    assert me["rewarded_scans"] == 10
    assert me["level"] == 3
    assert me["badges"][2]["unlocked"] is True
    assert me["badges"][3]["unlocked"] is False


def test_visibility_opt_in_and_private_rankings(client):
    signup(client, "Sam One", "sam@example.org")
    assert client.post("/api/leaderboard/visibility",json={"visible":True}).status_code == 403
    assert client.post("/api/leaderboard/visibility",headers=HEADERS,json={"visible":True}).status_code == 200
    board = client.get("/api/leaderboard").json()
    assert len(board["leaders"]) == 1
    assert board["leaders"][0]["name"] == "Sam One"
    assert "email" not in board["leaders"][0]
    assert "user_id" not in board["leaders"][0]
    assert "password_hash" not in board["leaders"][0]
    assert board["leaders"][0]["is_you"] is True
    assert client.post("/api/leaderboard/visibility",headers=HEADERS,json={"visible":False}).status_code == 200
    assert client.get("/api/leaderboard").json()["leaders"] == []


def test_actions_belong_to_owner_and_do_not_increase_xp(client):
    person = signup(client,"A Person","owner@example.org")
    scan_id = record_scan(person["id"],"model",prediction().model_dump(),photo_digest="unique-photo")
    url = "/api/scans/"+str(scan_id)+"/action"
    assert client.post(url,json={"action":"recycled"}).status_code == 403
    assert client.post(url,headers=HEADERS,json={"action":"unknown"}).status_code == 422
    assert client.post(url,headers=HEADERS,json={"action":"recycled"}).status_code == 200
    assert client.post(url,headers=HEADERS,json={"action":"reused"}).status_code == 200
    # My Activity must be able to display the saved action on each scan.
    saved = client.get("/api/scans").json()["scans"]
    assert next(row for row in saved if row["id"] == scan_id)["action"] == "reused"
    me = client.get("/api/leaderboard").json()["me"]
    assert me["actions"] == 1
    assert me["xp"] == 20
    client.post("/api/auth/logout",headers=HEADERS)
    signup(client,"Second Person","second@example.org")
    assert client.post(url,headers=HEADERS,json={"action":"reused"}).status_code == 404
    assert client.get("/api/leaderboard").json()["me"]["actions"] == 0


def test_existing_user_database_migrates_without_data_loss(tmp_path, monkeypatch):
    import app.accounts as accounts
    path = tmp_path / "legacy-db.sqlite3"
    monkeypatch.setenv("WASTELENS_DB", str(path))
    with sqlite3.connect(path) as db:
        db.execute("""CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL
        )""")
        db.execute("""INSERT INTO users(id,name,email,password_hash,role,created_at)
                      VALUES (42,'Existing Member','old@example.org','hash','user','2025-02-01')""")
    accounts.initialize()  # real migration from an earlier database schema
    with sqlite3.connect(path) as db:
        fields = [row[1] for row in db.execute("PRAGMA table_info(users)")]
        assert "leaderboard_visible" in fields
        assert db.execute("SELECT name FROM users WHERE id=42").fetchone()[0] == "Existing Member"
        assert db.execute("SELECT leaderboard_visible FROM users WHERE id=42").fetchone()[0] == 0
        assert "scan_rewards" in {
            row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }


def test_scan_milestone_uses_saved_scans_while_xp_remains_anti_abuse(client):
    """A user seeing 27 saved scans must have the 25-scan badge."""
    user = signup(client, "Badge Reader", "badge-reader@example.org")
    from app.gamification import new_badges_for_scan
    milestones = []
    for index in range(27):
        # No digest: these are stored scans but never earn XP.
        scan_id = record_scan(user["id"], "model", prediction("uncertain").model_dump())
        milestones.extend(b["threshold"] for b in new_badges_for_scan(scan_id))
    assert milestones == [1, 5, 10, 25]
    state = client.get("/api/leaderboard").json()["me"]
    assert state["scans"] == 27
    assert state["rewarded_scans"] == 0
    assert state["xp"] == 0
    assert state["badges"][3]["name"] == "Everyday Hero"
    assert state["badges"][3]["unlocked"] is True
    assert state["badges"][4]["unlocked"] is False
    assert new_badges_for_scan(scan_id) == []  # No repeat celebration.
