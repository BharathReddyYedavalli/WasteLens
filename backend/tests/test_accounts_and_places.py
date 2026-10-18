"""Local integration tests; no live Google Gemini or map API calls required."""
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.vision import ItemAnalysis


HEADERS = {"X-WasteLens-Request": "1"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB", str(tmp_path / "private.sqlite3"))
    monkeypatch.setenv("WASTELENS_ADMIN_EMAIL", "owner@example.org")
    monkeypatch.setenv("WASTELENS_ADMIN_PASSWORD", "example-test-password-1234")
    with TestClient(app) as test_client:
        yield test_client


def sign_up(client, name="Alex", email="alex@example.org"):
    return client.post(
        "/api/auth/signup", headers=HEADERS,
        json={"name": name, "email": email, "password": "very-strong-test-password"},
    )


def analysis():
    return ItemAnalysis(
        item_name="Reusable water bottle",
        visual_description="Blue bottle with a dark lid.",
        material_guess="Metal or plastic, uncertain",
        identification="likely",
        route="reuse_first",
        route_title="Continue using while functional",
        disposal_steps=["Check with a local processor before drop-off."],
        reuse_ideas=["Use as a spare bottle."],
        cautions=["Acceptance of this exact bottle is unverified."],
        follow_up_question="Is it made of metal?",
        location_helpful=True,
        collection_search_term="bottle recycling",
    )


def test_signup_signin_history_feedback_and_admin(client, monkeypatch):
    assert client.get("/api/auth/me").json() == {"user": None}
    assert client.get("/api/scans").status_code == 401
    assert client.get("/api/admin/users").status_code == 401

    assert client.post("/api/auth/signup", json={"name": "Alex", "email": "alex@example.org", "password": "very-strong-test-password"}).status_code == 403
    bad_password = client.post("/api/auth/signup", headers=HEADERS, json={
        "name": "Alex", "email": "alex@example.org", "password": "short"
    })
    assert bad_password.status_code == 422
    response = sign_up(client)
    assert response.status_code == 200
    assert response.json()["role"] == "user"
    cookie = response.headers["set-cookie"]
    assert "httponly" in cookie.lower()
    assert "samesite=lax" in cookie.lower()
    assert client.get("/api/auth/me").json()["user"]["email"] == "alex@example.org"
    assert sign_up(client).status_code == 409
    assert client.get("/api/admin/overview").status_code == 403

    import app.main as api
    monkeypatch.setattr(api, "analyze_photo", lambda *args: analysis())
    scan = client.post(
        "/api/ai/analyze",
        files={"image": ("photo.jpg", b"pretend photo", "image/jpeg")},
        data={"zip_code": "75063"},
    )
    assert scan.status_code == 200, scan.text
    saved = scan.json()["scan_id"]
    assert isinstance(saved, int)
    records = client.get("/api/scans").json()["scans"]
    assert len(records) == 1
    assert records[0]["item_name"] == "Reusable water bottle"
    assert records[0]["zip_code"] == "75063"
    assert records[0]["analysis"]["reuse_ideas"]
    assert "photo" not in records[0]
    assert client.post("/api/scans/" + str(saved) + "/feedback", json={"correct": True}).status_code == 403
    answer = client.post("/api/scans/" + str(saved) + "/feedback",
                         headers=HEADERS, json={"correct": False, "correction": "Thermos"})
    assert answer.status_code == 200
    assert answer.json()["feedback"] == "no"
    assert client.get("/api/scans").json()["scans"][0]["correction"] == "Thermos"

    assert client.post("/api/auth/logout", headers=HEADERS).status_code == 200
    assert client.get("/api/scans").status_code == 401
    assert client.post("/api/auth/login", headers=HEADERS, json={
        "email": "alex@example.org", "password": "wrong-password"
    }).status_code == 401

    admin = client.post("/api/auth/login", headers=HEADERS, json={
        "email": "owner@example.org", "password": "example-test-password-1234"
    })
    assert admin.status_code == 200
    assert admin.json()["role"] == "admin"
    overview = client.get("/api/admin/overview").json()
    assert overview["users"] == 2
    assert overview["scans"] == 1
    assert overview["no"] == 1
    users = client.get("/api/admin/users").json()["users"]
    assert len(users) == 2
    assert users[0].get("password_hash") is None
    feedback = client.get("/api/admin/feedback").json()["feedback"]
    assert len(feedback) == 1
    assert feedback[0]["item_name"] == "Reusable water bottle"
    assert feedback[0]["correction"] == "Thermos"
    assert "analysis_json" not in feedback[0]


def test_other_user_cannot_change_scan(client, monkeypatch):
    import app.main as api
    monkeypatch.setattr(api, "analyze_photo", lambda *args: analysis())
    assert sign_up(client).status_code == 200
    scan = client.post("/api/ai/analyze", files={
        "image": ("photo.jpg", b"pretend", "image/jpeg")
    }).json()["scan_id"]
    client.post("/api/auth/logout", headers=HEADERS)
    assert sign_up(client, name="Jordan", email="jordan@example.org").status_code == 200
    assert client.get("/api/scans").json()["scans"] == []
    response = client.post("/api/scans/" + str(scan) + "/feedback",
                           headers=HEADERS, json={"correct": True})
    assert response.status_code == 404


def test_finder_uses_real_provider_data_not_fake_locations(client, monkeypatch):
    from app import places
    places.resolve_zip.cache_clear()
    places._query_overpass.cache_clear()
    monkeypatch.setattr(places.zipcodes, "matching", lambda zip_code: [
        {"lat": "32.95", "long": "-96.80", "city": "Irving", "state": "TX"}
    ])
    seen = []
    def stub(url, data=None, timeout=15):
        seen.append((url, data))
        return {"elements": [
            {"type": "node", "id": 42, "lat": 32.96, "lon": -96.81,
             "tags": {"name": "Actual mapped recycler", "amenity": "recycling", "recycling_type": "centre", "phone": "+1-555-0100"}},
            {"type": "node", "id": 44, "lat": 32.95, "lon": -96.80,
             "tags": {"amenity": "recycling", "access": "private"}},
        ]}
    monkeypatch.setattr(places, "fetch_json", stub)
    assert client.get("/api/facilities?zip_code=bad").status_code == 422
    response = client.get("/api/facilities?zip_code=75063")
    assert response.status_code == 200, response.text
    data = response.json()
    assert len(data["facilities"]) == 1
    assert data["facilities"][0]["name"] == "Actual mapped recycler"
    assert data["facilities"][0]["kind"] == "center"
    assert data["facilities"][0]["phone"] == "+1-555-0100"
    assert data["facilities"][0]["verified_acceptance"] is False
    assert data["listing_status"] == "ok"
    assert len(seen) == 1 and seen[0][1] is not None
    places.resolve_zip.cache_clear()
    places._query_overpass.cache_clear()


def test_zip_offline_lookup_does_not_call_network(monkeypatch):
    from app import places
    def fail_online(*args, **kwargs):
        raise AssertionError("ZIP lookup must not call the network")
    monkeypatch.setattr(places, "fetch_json", fail_online)
    monkeypatch.setattr(places.zipcodes, "matching", lambda postal: [
        {"lat": "33.183", "long": "-96.845", "city": "Frisco", "state": "TX"}
    ])
    places.resolve_zip.cache_clear()
    lat, lon, label = places.resolve_zip("75033")
    assert round(lat, 3) == 33.183
    assert round(lon, 3) == -96.845
    assert label == "Frisco, TX"
    places.resolve_zip.cache_clear()


def test_missing_zip_is_not_declared_invalid(monkeypatch):
    from app import places
    monkeypatch.setattr(places.zipcodes, "matching", lambda postal: [])
    places.resolve_zip.cache_clear()
    with pytest.raises(Exception) as exc:
        places.resolve_zip("75033")
    assert "does not prove" in str(exc.value.detail)
    places.resolve_zip.cache_clear()


def test_provider_outage_keeps_base_map_available(client, monkeypatch):
    from app import places
    from fastapi import HTTPException
    places.resolve_zip.cache_clear()
    places._query_overpass.cache_clear()
    monkeypatch.setattr(places.zipcodes, "matching", lambda postal: [
        {"lat": "33.19", "long": "-96.83", "city": "Frisco", "state": "TX"}
    ])
    def unavailable(url, data=None, timeout=15):
        raise HTTPException(503, "Community provider is down")
    monkeypatch.setattr(places, "fetch_json", unavailable)
    response = client.get("/api/facilities?zip_code=75033")
    assert response.status_code == 200
    body = response.json()
    assert body["listing_status"] == "unavailable"
    assert body["facilities"] == []
    assert body["center"]["latitude"] == 33.19
    assert "temporarily unavailable" in body["notice"]
    places.resolve_zip.cache_clear()
    places._query_overpass.cache_clear()


def test_zip_library_contains_key_real_zips():
    # Real bundled offline US postal dataset; prevents repeat of a known
    # API-only ZIP lookup failure observed in the live WasteLens demo.
    from app import places
    places.resolve_zip.cache_clear()
    for postal in ("75033", "75063"):
        lat, lon, label = places.resolve_zip(postal)
        assert 24 < lat < 50 and -125 < lon < -65 and label
    places.resolve_zip.cache_clear()


def test_incomplete_admin_configuration_warns_but_does_not_crash(client, monkeypatch):
    from app.accounts import bootstrap_admin
    monkeypatch.setenv("WASTELENS_ADMIN_EMAIL", "admin@example.org")
    monkeypatch.setenv("WASTELENS_ADMIN_PASSWORD", "short")
    with pytest.warns(RuntimeWarning, match="Incomplete admin"):
        bootstrap_admin()
    assert client.get("/api/health").status_code == 200



def test_retry_wider_map_radius_if_no_locations_initially(client, monkeypatch):
    from app import places
    places.resolve_zip.cache_clear()
    places._query_overpass.cache_clear()
    monkeypatch.setattr(places.zipcodes, "matching", lambda z: [
        {"lat": "33.19", "long": "-96.83", "city": "Frisco", "state": "TX"}
    ])
    queries = []
    def fake_overpass(url, data=None, timeout=15):
        from urllib.parse import parse_qs
        query = parse_qs(data.decode("utf-8"))["data"][0]
        queries.append(query)
        if "around:20000" in query:
            return {"elements": []}
        return {"elements": [
            {"type":"node","id":127,"lat":33.35,"lon":-96.7,
             "tags":{"name":"Mapped recycling drop-off", "amenity":"recycling"}}
        ]}
    monkeypatch.setattr(places, "fetch_json", fake_overpass)
    response = client.get("/api/facilities?zip_code=75033")
    assert response.status_code == 200
    body = response.json()
    assert body["listing_status"] == "ok"
    assert body["radius_miles"] == 28.0
    assert len(body["facilities"]) == 1
    assert "around:20000" in queries[0]
    assert "around:45000" in queries[1]
    places.resolve_zip.cache_clear()
    places._query_overpass.cache_clear()


def test_zero_osm_locations_is_not_a_provider_outage(client, monkeypatch):
    from app import places
    places.resolve_zip.cache_clear()
    places._query_overpass.cache_clear()
    monkeypatch.setattr(places.zipcodes, "matching", lambda z: [
        {"lat": "33.19", "long": "-96.83", "city": "Frisco", "state": "TX"}
    ])
    monkeypatch.setattr(places, "fetch_json", lambda *a,**kw: {"elements":[]})
    response = client.get("/api/facilities?zip_code=75033")
    assert response.status_code == 200
    assert response.json()["listing_status"] == "no_results"
    assert response.json()["radius_miles"] == 28.0
    places.resolve_zip.cache_clear()
    places._query_overpass.cache_clear()


def test_overpass_fallback_includes_current_endpoint():
    from app import places
    assert "https://overpass.private.coffee/api/interpreter" in places.OVERPASS_SERVERS
    assert "https://overpass.kumi.systems/api/interpreter" not in places.OVERPASS_SERVERS
