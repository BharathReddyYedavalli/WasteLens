"""Multilingual Gemini TTS requests remain exact and use natural language metadata."""
from app import speech_audio

def test_language_style_is_specific_and_transcript_is_untouched(monkeypatch):
    seen=[]
    class FakeResponse:
        status_code=200
        def json(self):
            import base64
            wav=b"RIFF"+(36).to_bytes(4,"little")+b"WAVE"+b"fmt "+b"0"*32
            return {"candidates":[{"content":{"parts":[{"inlineData":{"data":base64.b64encode(wav).decode()}}]}}]}
    class FakeClient:
        def __init__(self,**kwargs):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,url,headers,json):
            seen.append(json)
            return FakeResponse()
    monkeypatch.setattr(speech_audio.httpx,"Client",FakeClient)
    for language,voice,text in [
        ("en","Aoede","Hello WasteLens"),
        ("es","Charon","Hola. ¿Dónde va esto?"),
        ("hi","Kore","नमस्ते। यह कहाँ जाएगा?"),
    ]:
        speech_audio._generate(text,voice,language,"test-key")
    for payload,lang in zip(seen,["en","es","hi"]):
        style=payload["contents"][0]["parts"][0]["speech_metadata"]["style"]
        assert len(style)>15
        assert payload["contents"][0]["parts"][0]["text"] in ("Hello WasteLens","Hola. ¿Dónde va esto?","नमस्ते। यह कहाँ जाएगा?")
    assert "español" in seen[1]["contents"][0]["parts"][0]["speech_metadata"]["style"]
    assert "हिंदी" in seen[2]["contents"][0]["parts"][0]["speech_metadata"]["style"]
