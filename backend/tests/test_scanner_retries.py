"""Scanner-only reliability tests. No image or credential reaches Gemini."""
import json
import logging
import sys
from io import BytesIO
from types import ModuleType, SimpleNamespace

import pytest
from PIL import Image

from app import vision


def sample_photo():
    buffer = BytesIO()
    Image.new("RGB", (80, 80), "green").save(buffer, "PNG")
    return buffer.getvalue()


SCAN_RESULT = json.dumps({
    "item_name": "Reusable water bottle",
    "visual_description": "A reusable bottle with a cap.",
    "material_guess": "Metal",
    "identification": "likely",
    "route": "reuse_first",
    "route_title": "Continue using",
    "disposal_steps": ["Keep using the bottle while it works."],
    "reuse_ideas": ["Refill it."],
    "reuse_projects": [],
    "cautions": [],
    "follow_up_question": "",
    "location_helpful": False,
    "collection_search_term": "",
})


class FakeGeminiError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__("SENSITIVE_PROVIDER_DETAIL_DO_NOT_LOG")


@pytest.fixture
def gemini_stub(monkeypatch):
    """Simulate the public SDK surface and control each provider response."""
    attempts = []
    configuration = []
    responses = []
    sleeps = []

    class FakeModels:
        def generate_content(self, **kwargs):
            attempts.append(kwargs)
            next_response = responses.pop(0)
            if isinstance(next_response, Exception):
                raise next_response
            return SimpleNamespace(text=next_response)

    def fake_client(**kwargs):
        configuration.append(kwargs)
        return SimpleNamespace(models=FakeModels())

    def options(**kwargs):
        return SimpleNamespace(**kwargs)

    fake_google = ModuleType("google")
    fake_google.__path__ = []
    fake_genai = ModuleType("google.genai")
    fake_genai.__path__ = []
    fake_genai.Client = fake_client
    fake_types = ModuleType("google.genai.types")
    fake_types.HttpOptions = options
    fake_types.HttpRetryOptions = options
    fake_types.GenerateContentConfig = options
    fake_types.Part = SimpleNamespace(from_bytes=lambda **kwargs: kwargs)
    fake_errors = ModuleType("google.genai.errors")
    fake_errors.APIError = FakeGeminiError
    fake_google.genai = fake_genai
    fake_genai.types = fake_types
    fake_genai.errors = fake_errors

    monkeypatch.setitem(sys.modules, "google", fake_google)
    monkeypatch.setitem(sys.modules, "google.genai", fake_genai)
    monkeypatch.setitem(sys.modules, "google.genai.types", fake_types)
    monkeypatch.setitem(sys.modules, "google.genai.errors", fake_errors)
    monkeypatch.setenv("GEMINI_API_KEY", "test-secret-do-not-log")
    monkeypatch.setattr(vision.time, "sleep", sleeps.append)
    monkeypatch.setattr(vision.random, "uniform", lambda minimum, maximum: 0.2)
    return SimpleNamespace(
        attempts=attempts, configuration=configuration,
        responses=responses, sleeps=sleeps,
    )


def test_scanner_configures_short_bounded_retries(gemini_stub):
    gemini_stub.responses[:] = [SCAN_RESULT]
    result = vision.analyze_photo(sample_photo(), vision.DEFAULT_MODEL)

    assert result.item_name == "Reusable water bottle"
    assert len(gemini_stub.attempts) == 1
    assert gemini_stub.sleeps == []
    config = gemini_stub.configuration[0]["http_options"]
    assert config.timeout == vision.SCAN_HTTP_TIMEOUT_MS
    assert config.retry_options.attempts == 1  # no hidden SDK retry loop
    assert gemini_stub.attempts[0]["model"] == vision.DEFAULT_MODEL


@pytest.mark.parametrize("errors_before_success,expected_delays", [
    ([503], [1.2]),
    ([503, 502], [1.2, 2.2]),
    ([500, 504], [1.2, 2.2]),
])
def test_transient_provider_errors_recover_with_bounded_backoff(
    gemini_stub, errors_before_success, expected_delays, caplog
):
    gemini_stub.responses[:] = [
        *(FakeGeminiError(code) for code in errors_before_success),
        SCAN_RESULT,
    ]
    with caplog.at_level(logging.INFO, logger=vision.__name__):
        result = vision.analyze_photo(sample_photo(), vision.DEFAULT_MODEL)

    assert result.item_name == "Reusable water bottle"
    assert len(gemini_stub.attempts) == len(errors_before_success) + 1
    assert gemini_stub.sleeps == expected_delays
    assert "Gemini scanner succeeded" in caplog.text
    assert "SENSITIVE_PROVIDER_DETAIL_DO_NOT_LOG" not in caplog.text
    assert "test-secret-do-not-log" not in caplog.text


def test_three_503s_exhaust_attempts_without_exposing_provider_response(
    gemini_stub, caplog
):
    gemini_stub.responses[:] = [FakeGeminiError(503) for _ in range(3)]
    with caplog.at_level(logging.WARNING, logger=vision.__name__):
        with pytest.raises(vision.AIUnavailable) as caught:
            vision.analyze_photo(sample_photo(), vision.DEFAULT_MODEL)

    assert caught.value.status_code == 502
    assert "HTTP 503" in caught.value.reason
    assert "temporarily unavailable" in caught.value.reason
    assert len(gemini_stub.attempts) == vision.SCAN_MAX_ATTEMPTS
    assert len(gemini_stub.sleeps) == vision.SCAN_MAX_ATTEMPTS - 1
    assert "SENSITIVE_PROVIDER_DETAIL_DO_NOT_LOG" not in caplog.text


@pytest.mark.parametrize("code,expected_status", [(429, 429), (400, 502), (401, 502), (403, 502), (404, 502)])
def test_quota_credentials_and_bad_requests_are_not_retried(
    gemini_stub, code, expected_status
):
    gemini_stub.responses[:] = [FakeGeminiError(code)]
    with pytest.raises(vision.AIUnavailable) as caught:
        vision.analyze_photo(sample_photo(), vision.DEFAULT_MODEL)

    assert caught.value.status_code == expected_status
    assert len(gemini_stub.attempts) == 1
    assert gemini_stub.sleeps == []


def test_invalid_structured_response_is_not_retried(gemini_stub):
    gemini_stub.responses[:] = ['{"item_name": "bottle"}']
    with pytest.raises(vision.AIUnavailable) as caught:
        vision.analyze_photo(sample_photo(), vision.DEFAULT_MODEL)

    assert "invalid result" in caught.value.reason
    assert len(gemini_stub.attempts) == 1
    assert gemini_stub.sleeps == []
