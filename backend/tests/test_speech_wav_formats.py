"""The Gemini audio endpoint always returns audio Safari can decode."""
import base64
import io
import wave
from app import speech_audio

def make_wav():
    stream=io.BytesIO()
    with wave.open(stream,"wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(24000)
        out.writeframes(b"\x00\x00"*240)
    return stream.getvalue()

def mock_gemini(monkeypatch,audio,mime):
    calls=[]
    class Response:
        status_code=200
        def json(self):
            return {"candidates":[{"content":{"parts":[{"inlineData":{
                "data":base64.b64encode(audio).decode(),
                "mimeType":mime,
            }}]}}]}
    class Client:
        def __init__(self,**kwargs):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,url,headers,json):
            calls.append(json)
            return Response()
    monkeypatch.setattr(speech_audio.httpx,"Client",Client)
    return calls

def test_wav_request_and_output_in_all_three_languages(monkeypatch):
    data=make_wav()
    calls=mock_gemini(monkeypatch,data,"audio/wav")
    for language,voice,text in [
        ("en","Aoede","Hello."),
        ("es","Charon","Hola."),
        ("hi","Kore","नमस्ते।")
    ]:
        result=speech_audio._generate(text,voice,language,"fake")
        assert result==data
        with wave.open(io.BytesIO(result),"rb") as wav:
            assert wav.getnchannels()==1
            assert wav.getframerate()==24000
            assert wav.getsampwidth()==2
    for call in calls:
        config=call["generationConfig"]
        assert config["responseFormat"]["audio"]=={"mimeType":"AUDIO_WAV","sampleRate":24000}
        assert config["responseModalities"]==["AUDIO"]

def test_legacy_pcm_is_wrapped_into_safari_compatible_wav(monkeypatch):
    raw=b"\x00\x00\x18\x00"*100
    mock_gemini(monkeypatch,raw,"audio/L16;codec=pcm;rate=24000")
    wav=speech_audio._generate("Hola.","Aoede","es","fake")
    assert wav[:4]==b"RIFF" and wav[8:12]==b"WAVE"
    with wave.open(io.BytesIO(wav),"rb") as audio:
        assert audio.readframes(audio.getnframes())==raw
        assert audio.getframerate()==24000
