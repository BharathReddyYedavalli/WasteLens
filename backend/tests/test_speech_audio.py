"""Natural Gemini voice endpoint: validate/limit without live API credentials."""
import base64

from fastapi.testclient import TestClient
from app.main import app
from app import speech_audio

HEAD={"X-WasteLens-Request":"1"}
VALID={"voice":"Aoede","language":"en","text":"Hello. This is WasteLens."}
WAV=b"RIFF"+(36).to_bytes(4,"little")+b"WAVE"+b"fmt "+b"0"*32

def test_requires_explicit_header_and_key(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY","")
    with TestClient(app) as client:
        assert client.post("/api/speech/generate",json=VALID).status_code==403
        assert client.post("/api/speech/generate",headers=HEAD,json=VALID).status_code==503

def test_presets_and_input_length_are_validated(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY","test-key")
    with TestClient(app) as client:
        assert client.post("/api/speech/generate",headers=HEAD,
            json={**VALID,"voice":"Unapproved"}).status_code==422
        assert client.post("/api/speech/generate",headers=HEAD,
            json={**VALID,"text":"x"*601}).status_code==422
        assert client.post("/api/speech/generate",headers=HEAD,
            json={**VALID,"language":"zz"}).status_code==422

def test_returns_wav_and_no_cache_without_network(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY","fake-key")
    monkeypatch.setattr(speech_audio,"_generate",
        lambda text,voice,lang,key:WAV)
    with TestClient(app) as client:
        response=client.post("/api/speech/generate",headers=HEAD,json=VALID)
        assert response.status_code==200,response.text
        assert response.content==WAV
        assert response.headers["content-type"].startswith("audio/wav")
        assert response.headers["cache-control"]=="no-store"

def test_gemini_request_uses_whitelist_model_and_returns_wav(monkeypatch):
    class FakeResponse:
        status_code=200
        def json(self):
            return {"candidates":[{"content":{"parts":[{"inlineData":{
                "data":base64.b64encode(WAV).decode("ascii")
            }}]}}]}
    calls=[]
    class FakeClient:
        def __init__(self,**kwargs): pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,url,headers,json):
            calls.append((url,headers,json))
            return FakeResponse()
    monkeypatch.setattr(speech_audio.httpx,"Client",FakeClient)
    out=speech_audio._generate("Hello","Kore","en","private-key")
    assert out==WAV
    url,headers,payload=calls[0]
    assert url.endswith("gemini-3.8-flash-lite-tts:generateContent")
    assert headers["x-goog-api-key"]=="private-key"
    assert payload["generationConfig"]["responseModalities"]==["AUDIO"]
    assert payload["generationConfig"]["speechConfig"]["voiceConfig"]["voice"]=="Kore"
    assert payload["contents"][0]["parts"][0]["text"]=="Hello"

def test_rate_limit_rejects_many_requests(monkeypatch):
    from starlette.requests import Request
    monkeypatch.setattr(speech_audio,"MAX_REQUESTS_PER_WINDOW",2)
    speech_audio._recent.clear()
    req=Request({"type":"http","method":"POST","path":"/api/speech/generate",
                 "headers":[],"client":("10.2.3.4",2222),"scheme":"http"})
    speech_audio._limit(req)
    speech_audio._limit(req)
    from fastapi import HTTPException
    try:
        speech_audio._limit(req)
    except HTTPException as exc:
        assert exc.status_code==429
    else:
        raise AssertionError("Rate limit did not apply")
