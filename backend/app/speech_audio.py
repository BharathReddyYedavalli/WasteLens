"""On-demand Gemini natural text-to-speech for the Accessibility panel.

Users must explicitly select AI voices and press Listen/Test Voice. The browser
never receives the Google API key. No spoken text or audio is stored.
"""
from __future__ import annotations

import base64
import binascii
import io
import wave
import os
import threading
import time
from collections import defaultdict

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field
from typing import Literal

from .accounts import require_same_origin_action

router = APIRouter(prefix="/api/speech", tags=["Accessibility speech"])
MODEL = "gemini-3.8-flash-lite-tts"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
VOICE_NAMES = (
    "Kore", "Aoede", "Sulafat", "Zephyr",
    "Puck", "Charon", "Achird", "Algieba",
)
MAX_TEXT_CHARS = 600
MAX_AUDIO_BYTES = 4 * 1024 * 1024
WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = 10
_recent: dict[str, list[float]] = defaultdict(list)
_lock = threading.Lock()


class VoiceRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)
    voice: Literal["Kore", "Aoede", "Sulafat", "Zephyr", "Puck", "Charon", "Achird", "Algieba"]
    language: Literal["en", "es", "hi"] = "en"


def _limit(request: Request):
    # Per-process, best-effort guard against accidentally exhausting free quota.
    key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _lock:
        events = [when for when in _recent[key] if when > now - WINDOW_SECONDS]
        if len(events) >= MAX_REQUESTS_PER_WINDOW:
            raise HTTPException(429, "Natural speech is being used too often. Try again shortly.")
        events.append(now)
        _recent[key] = events
        # Avoid keeping old client addresses in memory.
        if len(_recent) > 500:
            for client, times in list(_recent.items()):
                if not times or max(times) <= now - WINDOW_SECONDS:
                    _recent.pop(client, None)


def _generate(text: str, voice: str, language: str, key: str) -> bytes:
    # Text is the transcript itself: no extra content, user information or
    # old chat history is sent. Only a user-initiated spoken chunk.
    # Gemini 3.8 auto-detects English, Hindi and Spanish from the transcript.
    # Keep the simple, formerly working style for all supported languages;
    # translation-specific style directives are unnecessary and can regress
    # successful read-aloud requests. The transcript is still verbatim.
    payload = {
        "contents": [{"role": "user", "parts": [{
            "text": text,
            "speech_metadata": {"style": "clear, natural, conversational; say the exact words"}
        }]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            # Unary Gemini 3.8 requests support an explicit RIFF/WAV response.
            # Safari's AudioContext.decodeAudioData needs a decodable container.
            "responseFormat": {"audio": {"mimeType": "AUDIO_WAV", "sampleRate": 24000}},
            "speechConfig": {"voiceConfig": {"voice": voice}},
        },
    }
    try:
        with httpx.Client(timeout=40) as client:
            result = client.post(
                GEMINI_URL,
                headers={"x-goog-api-key": key},
                json=payload,
            )
        if result.status_code == 429:
            # Google enforces per-project rate, token and daily quotas. Do not
            # retry in a loop (that wastes requests and cannot bypass a limit).
            # Forward Retry-After when Google provides one; no fake reset time.
            retry_after = result.headers.get("Retry-After", "").strip()
            headers = {"Retry-After": retry_after} if retry_after else None
            raise HTTPException(
                429,
                "Gemini's speech request limit was reached. Listen again after "
                "the limit resets, or check this project's Gemini API rate limits "
                "and billing in Google AI Studio.",
                headers=headers,
            )
        if result.status_code in (401, 403, 404):
            raise HTTPException(503, "Natural AI speech isn't available for this Gemini API key or model.")
        if result.status_code == 400:
            raise HTTPException(502, "Gemini rejected the speech request. Check the speech model and voice configuration.")
        if result.status_code != 200:
            raise HTTPException(502, "Gemini couldn't generate audio right now.")
        parts = result.json()["candidates"][0]["content"]["parts"]
        data = next(part["inlineData"] for part in parts if part.get("inlineData"))
        encoded = data["data"]
        if len(encoded) > (MAX_AUDIO_BYTES * 4 // 3) + 8:
            raise HTTPException(502, "Generated audio was too large.")
        audio_bytes = base64.b64decode(encoded, validate=True)
        if audio_bytes.startswith(b"RIFF") and audio_bytes[8:12] == b"WAVE":
            if len(audio_bytes) > MAX_AUDIO_BYTES:
                raise HTTPException(502, "Generated audio was too large.")
            return audio_bytes
        # Defensive fallback for an upstream legacy/raw PCM audio/l16 reply.
        mime = data.get("mimeType", "").lower()
        if mime.startswith("audio/l16") and len(audio_bytes) % 2 == 0:
            if len(audio_bytes) > MAX_AUDIO_BYTES - 44:
                raise HTTPException(502, "Generated audio was too large.")
            wav_file = io.BytesIO()
            with wave.open(wav_file, "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(24000)
                output.writeframes(audio_bytes)
            return wav_file.getvalue()
        raise HTTPException(502, "Gemini returned audio Safari cannot play.")
    except HTTPException:
        raise
    except (httpx.HTTPError, binascii.Error, KeyError, ValueError, IndexError, StopIteration, TypeError) as exc:
        raise HTTPException(502, "Natural speech couldn't be generated. Please try again.") from exc


@router.post("/generate")
def generate_speech(request: Request, payload: VoiceRequest):
    require_same_origin_action(request)
    text = payload.text.strip()
    if not text:
        raise HTTPException(422, "Provide text to read.")
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise HTTPException(503, "Natural AI voices need a configured Gemini API key.")
    _limit(request)
    wav = _generate(text, payload.voice, payload.language, key)
    return Response(
        content=wav,
        media_type="audio/wav",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )
