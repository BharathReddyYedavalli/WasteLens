"""WasteLens's free-tier Gemini prototype API: image analysis, not local facility verification."""
from pathlib import Path
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)

from .vision import AIUnavailable, DEFAULT_MODEL, InvalidPhoto, MODELS, MAX_BYTES, analyze_photo, configured

app = FastAPI(
    title="WasteLens Vision AI",
    version="0.2.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "WasteLens Gemini prototype"}


@app.get("/api/ai/status")
def ai_status():
    return {
        "configured": configured(),
        "default_model": DEFAULT_MODEL,
        "models": [{"id": id, "name": name} for id, name in MODELS.items()],
        "privacy_notice": "Photos are sent to Google's Gemini API only when you analyze them. Google's free tier may use content to improve its products.",
    }


@app.post("/api/ai/analyze")
async def ai_analyze(
    image: UploadFile = File(...),
    model_id: str = Form(DEFAULT_MODEL),
    object_hint: str = Form(""),
):
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Upload a JPG, PNG or WebP image.")
    if model_id not in MODELS:
        raise HTTPException(400, "Unsupported AI model selection.")
    if len(object_hint) > 160:
        raise HTTPException(400, "Object hint must be at most 160 characters.")
    payload = await image.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise HTTPException(413, "Photo must be 8 MB or smaller.")
    try:
        result = await run_in_threadpool(analyze_photo, payload, model_id, object_hint)
        return {"model_id": model_id, "analysis": result.model_dump(), "local_facilities_verified": False}
    except InvalidPhoto as exc:
        raise HTTPException(400, str(exc)) from exc
    except AIUnavailable as exc:
        raise HTTPException(exc.status_code, exc.reason) from exc
