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
    assert first.json()["scan_id"] is not None

    replay = scan(b"image number 1")
    assert replay.json()["earned_xp"] == 0
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
    assert client.get("/api/leaderboard").json()["me"]["xp"] == 20

    assert client.post("/api/auth/logout",headers=HEADERS).status_code == 200
    assert client.get("/api/leaderboard").json()["me"] is None
    logged_out = scan(b"anonymous scan")
    assert logged_out.json()["scan_id"] is None
    assert logged_out.json()["earned_xp"] == 0


def test_badges_levels_and_daily_cap(client):
    person = signup(client, "Scanned A Lot", "scanner@example.org")
    for index in range(11):
        scan_id = record_scan(
            person["id"], "model", prediction().model_dump(),
            photo_digest=hashlib.sha256(("image"+str(index)).encode()).hexdigest()
        )
        assert xp_for_scan(scan_id) == (20 if index < 10 else 0)
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
    me = client.get("/api/leaderboard").json()["me"]
    assert me["actions"] == 1
    assert me["xp"] == 20
    client.post("/api/auth/logout",headers=HEADERS)
    signup(client,"Second Person","second@example.org")
    assert client.post(url,headers=HEADERS,json={"action":"reused"}).status_code == 404
    assert client.get("/api/leaderboard").json()["me"]["actions"] == 0


def test_existing_user_database_migrates_without_data_loss(client):
    import app.accounts as accounts
    path = accounts.db_path()
    with sqlite3.connect(path) as db:
        fields = [row[1] for row in db.execute("PRAGMA table_info(users)")]
        assert "leaderboard_visible" in fields
        assert "scan_rewards" in {
            row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }
