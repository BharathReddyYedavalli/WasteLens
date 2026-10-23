"""Shared kiosk photo checks must not add private scan history or rewards."""
from fastapi.testclient import TestClient
from app.main import app
from app.vision import ItemAnalysis

HEADERS = {"X-WasteLens-Request": "1"}


def fake_analysis(*_args):
    return ItemAnalysis(
        item_name="Drink bottle", visual_description="An empty drink bottle.",
        material_guess="Plastic, not verified", identification="likely",
        route="check_recycling", route_title="Check local recycling rules",
        disposal_steps=["Check the collection program's instructions."],
        reuse_ideas=["Reuse if clean and safe."],
        cautions=["The correct bin depends on local rules."],
        follow_up_question="", location_helpful=True, collection_search_term="drink bottle"
    )


def test_signed_in_kiosk_scan_is_ephemeral_but_regular_scans_still_save(tmp_path, monkeypatch):
    import app.main as api
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "kiosk.sqlite3"))
    monkeypatch.setenv("WASTELENS_ADMIN_EMAIL", "")
    monkeypatch.setattr(api, "analyze_photo", fake_analysis)
    with TestClient(app) as client:
        signup = client.post("/api/auth/signup", headers=HEADERS, json={
            "name": "Test User", "email": "tester@example.org",
            "password": "really-long-test-password"
        })
        assert signup.status_code == 200, signup.text
        kiosk = client.post("/api/ai/analyze",
                            files={"image": ("bottle.jpg", b"fake image mocked", "image/jpeg")},
                            data={"kiosk_mode": "true"})
        assert kiosk.status_code == 200, kiosk.text
        data = kiosk.json()
        assert data["analysis"]["item_name"] == "Drink bottle"
        assert data["scan_id"] is None
        assert data["earned_xp"] == 0
        assert data["unlocked_badges"] == []
        assert client.get("/api/scans").json()["scans"] == []

        ordinary = client.post("/api/ai/analyze",
                               files={"image": ("bottle.jpg", b"fake image mocked", "image/jpeg")})
        assert ordinary.status_code == 200, ordinary.text
        assert isinstance(ordinary.json()["scan_id"], int)
        assert len(client.get("/api/scans").json()["scans"]) == 1


def test_guest_kiosk_scan_does_not_require_account(tmp_path, monkeypatch):
    import app.main as api
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "guest.sqlite3"))
    monkeypatch.setenv("WASTELENS_ADMIN_EMAIL", "")
    monkeypatch.setattr(api, "analyze_photo", fake_analysis)
    with TestClient(app) as client:
        r=client.post("/api/ai/analyze",
                      files={"image": ("bottle.png", b"mock", "image/png")},
                      data={"kiosk_mode": "true"})
        assert r.status_code==200,r.text
        assert r.json()["scan_id"] is None
