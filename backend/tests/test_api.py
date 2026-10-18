from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200 and resp.json()["ok"] is True

def test_model_catalog():
    resp = client.get("/api/models")
    assert resp.status_code == 200
    assert resp.json()["default_model_id"] == "mobilenetv3-v2"
    assert len(resp.json()["models"]) == 4

def test_upload_rejects_wrong_type():
    resp = client.post("/api/classify", files={"image": ("a.txt", b"hello", "text/plain")})
    assert resp.status_code == 415
