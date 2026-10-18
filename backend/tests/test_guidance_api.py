from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_user_confirmed_material_guidance():
    r = client.get("/api/guidance/metal")
    assert r.status_code == 200
    assert r.json()["material"] == "metal"
    assert r.json()["category"] == "Check local recycling"
    assert r.json()["guidance"]["source_url"].startswith("https://www.epa.gov/")

def test_invalid_material_not_available():
    assert client.get("/api/guidance/metal%20or%20trash").status_code == 404
