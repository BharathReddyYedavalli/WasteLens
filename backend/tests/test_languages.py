"""Language routing for AI analysis and chat; no external provider call."""
from fastapi.testclient import TestClient

from app.main import app
from app.vision import ItemAnalysis, InvalidPhoto, MODELS, LANGUAGE_NAMES

def test_supported_languages():
    assert LANGUAGE_NAMES == {"en": "English", "es": "Spanish", "hi": "Hindi"}

def test_reject_unrecognized_vision_locale_before_external_api():
    from app.vision import analyze_photo
    try:
        analyze_photo(b"", next(iter(MODELS)), language="xx")
        assert False, "Expected rejection"
    except InvalidPhoto as exception:
        assert "language" in str(exception).lower()

def test_chat_locale_defaults_and_rejects_other_values():
    from app.chat import ChatRequest
    data = dict(question="Where should it go?", model_id=next(iter(MODELS)))
    assert ChatRequest(**data).language == "en"
    assert ChatRequest(**{**data, "language": "hi"}).language == "hi"
    import pytest
    with pytest.raises(Exception):
        ChatRequest(**{**data, "language": "xx"})

def test_scan_language_validation():
    # Request is rejected before photo parsing or AI calls.
    with TestClient(app) as client:
        response = client.post("/api/ai/analyze", data={"language": "xx"},
            files={"image": ("test.jpg", b"example", "image/jpeg")})
        assert response.status_code == 422
