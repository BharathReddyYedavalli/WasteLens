"""Speech quota regressions: do not conflate Google quota with local limits."""
from fastapi import HTTPException
from app import speech_audio


def test_google_429_keeps_provider_retry_after(monkeypatch):
    class RateLimited:
        status_code=429
        headers={"Retry-After":"75"}
    class Client:
        def __init__(self,**kwargs): pass
        def __enter__(self): return self
        def __exit__(self,*args): pass
        def post(self,*args,**kwargs): return RateLimited()
    monkeypatch.setattr(speech_audio.httpx,"Client",Client)
    try:
        speech_audio._generate("Hello","Aoede","en","fake-key")
    except HTTPException as exc:
        assert exc.status_code==429
        assert "rate limits" in exc.detail
        assert exc.headers=={"Retry-After":"75"}
    else:
        raise AssertionError("Google rate limit was not reported")


def test_google_429_without_retry_after_does_not_guess_reset(monkeypatch):
    class RateLimited:
        status_code=429
        headers={}
    class Client:
        def __init__(self,**kwargs): pass
        def __enter__(self): return self
        def __exit__(self,*args): pass
        def post(self,*args,**kwargs): return RateLimited()
    monkeypatch.setattr(speech_audio.httpx,"Client",Client)
    try:
        speech_audio._generate("Hello","Aoede","en","fake-key")
    except HTTPException as exc:
        assert exc.status_code==429
        assert exc.headers is None
    else:
        raise AssertionError("Google rate limit was not reported")
