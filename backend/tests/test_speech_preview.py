"""Regression checks for Gemini Test Voice with English, Spanish and Hindi.

The provider is mocked: these tests check the actual HTTP endpoint and verify
the selected voice/language reaches the backend without consuming quota.
"""
from fastapi.testclient import TestClient
from app.main import app
from app import speech_audio

SAMPLES=[
    ("en","Aoede","Hello. This is the WasteLens reading voice."),
    ("es","Charon","Hola. Esta es la voz de WasteLens."),
    ("hi","Puck","नमस्ते। यह WasteLens की पढ़ने की आवाज़ है।"),
]
WAV=b"RIFF"+(36).to_bytes(4,"little")+b"WAVE"+b"fmt "+b"0"*32

def test_voice_samples_route_through_real_endpoint(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY","mock-key")
    speech_audio._recent.clear()
    requests=[]
    def fake_generate(text,voice,language,key):
        requests.append((text,voice,language,key))
        return WAV
    monkeypatch.setattr(speech_audio,"_generate",fake_generate)
    with TestClient(app) as client:
        for language,voice,phrase in SAMPLES:
            response=client.post("/api/speech/generate",
                headers={"X-WasteLens-Request":"1"},
                json={"text":phrase,"voice":voice,"language":language})
            assert response.status_code==200,response.text
            assert response.headers["content-type"].startswith("audio/wav")
            assert response.content==WAV
    assert requests==[(text,voice,lang,"mock-key") for lang,voice,text in SAMPLES]

def test_invalid_voice_or_language_rejected(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY","mock-key")
    with TestClient(app) as client:
        for key,value in (("voice","unknown-voice"),("language","zz")):
            payload={"text":"Hello","voice":"Aoede","language":"en",key:value}
            response=client.post("/api/speech/generate",
                headers={"X-WasteLens-Request":"1"},json=payload)
            assert response.status_code==422

def test_upstream_bad_request_has_actionable_error(monkeypatch):
    class UpstreamError:
        status_code=400
        headers={}
    class FakeClient:
        def __init__(self,**kwargs):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,*args,**kwargs):return UpstreamError()
    monkeypatch.setattr(speech_audio.httpx,"Client",FakeClient)
    from fastapi import HTTPException
    try:
        speech_audio._generate("Hello","Aoede","en","mock-key")
    except HTTPException as exc:
        assert exc.status_code==502
        assert "rejected the speech request" in exc.detail
    else:
        raise AssertionError("Gemini 400 was not detected")
