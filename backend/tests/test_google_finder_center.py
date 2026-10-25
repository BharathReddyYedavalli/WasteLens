"""Google ZIP center lookup must not invoke the unreliable community provider."""
from fastapi.testclient import TestClient
from app.main import app
from app import places


def test_fast_google_zip_center_without_overpass(monkeypatch):
    def unexpected(*args, **kwargs):
        raise AssertionError("A Google ZIP lookup must not call Overpass")
    monkeypatch.setattr(places, "_query_overpass", unexpected)
    with TestClient(app) as client:
        result = client.get("/api/facilities/center?zip_code=75033")
        assert result.status_code == 200, result.text
        data = result.json()
        assert data["zip_code"] == "75033"
        assert -90 <= data["center"]["latitude"] <= 90
        assert -180 <= data["center"]["longitude"] <= 180
        assert data["facilities"] == []
        assert data["acceptance_verified"] is False
        assert data["listing_status"] == "no_results"
        assert data["radius_miles"] > 0
        assert client.get("/api/facilities/center?zip_code=abcde").status_code == 422
        assert client.get("/api/facilities/center?zip_code=7503").status_code == 422
