"""WasteLens API: Gemini photo identification, account history and in-page maps."""
from contextlib import asynccontextmanager
import hashlib
from pathlib import Path
import os
import re

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from starlette.concurrency import run_in_threadpool

load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)

from .accounts import bootstrap_admin, get_user, initialize, record_scan, router as account_router
from .gamification import router as game_router, xp_for_scan, new_badges_for_scan
from .community_audits import router as audit_router
from .places import router as places_router
from .deposit_rules import router as deposit_router
from .local_rules import router as local_rules_router
from .program_rules import router as program_rules_router
from .kiosk_profiles import router as kiosk_profile_router
from .guidance_discovery import router as discovery_router
from .vision import AIUnavailable, DEFAULT_MODEL, InvalidPhoto, MODELS, MAX_BYTES, analyze_photo, configured
from .chat import ChatRequest, answer_chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize()
    bootstrap_admin()
    yield


app = FastAPI(
    title="WasteLens Vision AI",
    version="0.3.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)
app.include_router(account_router)
app.include_router(places_router)
app.include_router(game_router)
app.include_router(audit_router)
app.include_router(deposit_router)
app.include_router(local_rules_router)
app.include_router(program_rules_router)
app.include_router(kiosk_profile_router)
app.include_router(discovery_router)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "WasteLens"}


@app.get("/api/ai/status")
def ai_status():
    return {
        "configured": configured(),
        "default_model": DEFAULT_MODEL,
        "models": [{"id": identifier, "name": name} for identifier, name in MODELS.items()],
        "privacy_notice": "Photos are sent to Google's Gemini API only when you analyze them. Google's free tier may use content to improve its products.",
    }


@app.post("/api/ai/analyze")
async def ai_analyze(
    request: Request,
    image: UploadFile = File(...),
    model_id: str = Form(DEFAULT_MODEL),
    object_hint: str = Form(""),
    zip_code: str = Form(""),
    language: str = Form("en"),
    kiosk_mode: bool = Form(False),
):
    if language not in {"en", "es", "hi"}:
        raise HTTPException(422, "Unsupported language. Choose en, es or hi.")
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Upload a JPG, PNG or WebP image.")
    if model_id not in MODELS:
        raise HTTPException(400, "Unsupported AI model selection.")
    if len(object_hint) > 160:
        raise HTTPException(400, "Object hint must be at most 160 characters.")
    if zip_code and not re.fullmatch(r"\d{5}", zip_code):
        raise HTTPException(422, "Use a five-digit US ZIP code or leave ZIP empty.")
    payload = await image.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise HTTPException(413, "Photo must be 8 MB or smaller.")
    try:
        if language == "en":
            result = await run_in_threadpool(analyze_photo, payload, model_id, object_hint)
        else:
            result = await run_in_threadpool(analyze_photo, payload, model_id, object_hint, language)
        analysis = result.model_dump()
        # Shared kiosk scans are never associated with a personal account.
        # The photo still goes to the configured AI provider for identification.
        user = None if kiosk_mode else get_user(request)
        scan_id = record_scan(
            user["id"], model_id, analysis, zip_code or None,
            hashlib.sha256(str(user["id"]).encode() + b":" + payload).hexdigest(),
        ) if user else None
        return {
            "model_id": model_id, "analysis": analysis,
            "local_facilities_verified": False,
            "scan_id": scan_id, "earned_xp": xp_for_scan(scan_id) if scan_id else 0,
            "unlocked_badges": new_badges_for_scan(scan_id) if scan_id else [],
        }
    except InvalidPhoto as exc:
        raise HTTPException(400, str(exc)) from exc
    except AIUnavailable as exc:
        raise HTTPException(exc.status_code, exc.reason) from exc


@app.post("/api/ai/chat")
async def ai_chat(payload: ChatRequest):
    if payload.model_id not in MODELS:
        raise HTTPException(400, "Unsupported AI model selection.")
    if not payload.question.strip():
        raise HTTPException(400, "Ask a question before sending.")
    try:
        answer = await run_in_threadpool(answer_chat, payload)
        return {"answer": answer, "model_id": payload.model_id,
                "context_used": payload.scan is not None,
                "local_facilities_verified": False}
    except AIUnavailable as exc:
        raise HTTPException(exc.status_code, exc.reason) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
