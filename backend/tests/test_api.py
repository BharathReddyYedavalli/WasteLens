from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image
from app.main import app
from app.vision import AIUnavailable, ItemAnalysis, prepare_photo, InvalidPhoto

client = TestClient(app)

def test_health_and_catalog():
    assert client.get("/api/health").json()["ok"] is True
    catalog = client.get("/api/ai/status").json()
    assert catalog["default_model"] == "gemini-3.5-flash-lite"
    assert catalog["models"] == [{"id": "gemini-3.5-flash-lite", "name": "Gemini 3.5 Flash-Lite"}]
    assert "GEMINI_API_KEY" not in catalog

def test_invalid_upload():
    r = client.post("/api/ai/analyze", files={"image": ("bad.txt", b"hello", "text/plain")})
    assert r.status_code == 415

def test_oversized_photo():
    r = client.post("/api/ai/analyze", files={"image": ("big.png", b"x" * (8 * 1024 * 1024 + 1), "image/png")})
    assert r.status_code == 413

def test_invalid_model_rejected_without_provider_call():
    r = client.post("/api/ai/analyze", data={"model_id": "attacker-model"},
                    files={"image": ("photo.jpg", b"jpg", "image/jpeg")})
    assert r.status_code == 400

def test_photo_exif_and_resize():
    photo = Image.new("RGB", (2000, 1200), "blue")
    image = BytesIO()
    photo.save(image, format="PNG")
    result = prepare_photo(image.getvalue())
    verified = Image.open(BytesIO(result))
    assert max(verified.size) == 1280
    assert verified.format == "JPEG"

def test_real_response_contract_with_provider_mock(monkeypatch):
    import app.main as api
    def fake_analyze(data, model, hint):
        assert data.startswith(b"TEST")
        assert model == "gemini-3.5-flash-lite"
        assert hint == "the bottle"
        return ItemAnalysis(
            item_name="Reusable water bottle",
            visual_description="Blue water bottle with black lid.",
            material_guess="Unknown, possibly metal or plastic",
            identification="likely", route="reuse_first",
            route_title="Keep using it while functional",
            disposal_steps=["Confirm its material before seeking specialized recycling."],
            reuse_ideas=["Use as a backup travel bottle."],
            cautions=["Local recycling acceptance is unknown."],
            follow_up_question="Is the body metal or plastic?",
            location_helpful=False, collection_search_term=""
        )
    monkeypatch.setattr(api, "analyze_photo", fake_analyze)
    r = client.post("/api/ai/analyze", data={"object_hint": "the bottle"},
                    files={"image": ("photo.jpg", b"TEST PHOTO", "image/jpeg")})
    assert r.status_code == 200
    assert r.json()["analysis"]["item_name"] == "Reusable water bottle"
    assert r.json()["local_facilities_verified"] is False

def test_rate_limit_is_explained_without_leaking_provider_info(monkeypatch):
    import app.main as api
    def fake(*args):
        raise AIUnavailable("Free-tier limit reached. Wait before trying another photo.", 429)
    monkeypatch.setattr(api, "analyze_photo", fake)
    r = client.post("/api/ai/analyze", files={"image": ("photo.jpg", b"TEST", "image/jpeg")})
    assert r.status_code == 429
    assert "Free-tier" in r.json()["detail"]

def test_bad_image_rejected_by_validator():
    try:
        prepare_photo(b"not an image")
        assert False
    except InvalidPhoto:
        pass
