"""Gemini image understanding and structured, item-specific reuse/disposal ideas.

No image is stored to disk; requests are forwarded to the Gemini API only when
a user explicitly clicks Analyze. Free-tier image data may be used by Google to
improve their services. Never log photo bytes, API keys or provider responses.
"""
from __future__ import annotations

from io import BytesIO
import os
import time
from pathlib import Path
from typing import Literal

from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field, ValidationError

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL = "gemini-3.8-flash"
MODELS = {
    DEFAULT_MODEL: "Gemini 3.8 Flash · recommended",
    "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite · faster alternative",
}
MAX_BYTES = 8 * 1024 * 1024
MAX_PIXELS = 25_000_000

PROMPT = """You are WasteLens, an image-based assistant for US household waste sorting.
Focus on the item the person intends to sort, not the person's shirt or room.
If there are multiple objects and no clear target, state that you are uncertain
and ask which object they mean. An optional user-supplied object hint identifies
the target but does not establish its material or disposal eligibility.
Return the MOST SPECIFIC visible object name justified by the image (e.g.
'insulated reusable water bottle', not 'metal'). Do not guess brands, coatings,
battery chemistry, hidden contents, recycling symbols, or material types
you cannot visually verify. Material might be 'unknown'.
Prioritize safe reuse and repair over discarding an intact reusable item.
Provide 3–5 unique, realistic reuse projects tailored to the EXACT visible
item and its plausible material/condition. Include a descriptive project title,
what it becomes, why it is useful, a short list of tools/materials, 2–5 concrete
steps, an estimated number of active minutes, and an honest difficulty level.
Projects must not require cutting pressurized containers, damaging batteries,
unsafe heating, handling chemicals, sharp electronics or hazardous waste.
Don't encourage reusing single-use food packaging for food/drinks or suggest
a project that requires properties not established by the photo.
If the object is still durable and reusable (e.g. insulated water bottle),
suggest continued reuse first; only suggest upcycling if truly appropriate.
Use fewer or ZERO projects for unsafe/unidentified items rather than inventing
unsafe or generic filler. In addition, keep brief 'reuse_ideas' summaries for
backward compatibility with existing scan histories.
Provide 2–5 concrete disposal/preparation
steps specific to this item without asserting local curbside acceptance.
If batteries, electronics, sharps, chemicals or hazardous content might be
present, flag safe handling and require special collection or clarification.
Do not instruct users to dismantle dangerous objects.
Compost is conditional on exact food/material and local compost rules.
Do not fabricate any recycling-center name, exact address, map result,
certification, live policy, or environmental savings.
Never claim local acceptance is known without verified location-specific data.
Clearly state uncertainty when a photograph is insufficient.
Avoid generic filler. Use warm, simple writing with short, direct sentences.
Do not use dashes as punctuation, advertising phrases, vague enthusiasm,
or repeated cautions. Give concrete help for this exact object.
In each project, prioritize what someone can really do at home.
Write in concise everyday language matching the requested response language. If no language is specified, use English."""

class ReuseProject(BaseModel):
    title: str = Field(min_length=3, max_length=90, description="Short, distinctive project name")
    outcome: str = Field(min_length=5, max_length=180, description="What the object becomes and why it's useful")
    materials_needed: list[str] = Field(default_factory=list, max_length=8)
    steps: list[str] = Field(default_factory=list, max_length=6)
    difficulty: Literal["Easy", "Moderate", "Advanced"] = "Easy"
    minutes_estimate: int = Field(ge=1, le=480, description="Rough active project time, not a guarantee")
    safety_note: str = Field(default="", max_length=250, description="Safety note if applicable")


class ItemAnalysis(BaseModel):
    item_name: str = Field(description="Specific visible object, or 'Unidentified object'")
    visual_description: str = Field(description="One sentence grounded in visible features")
    material_guess: str = Field(description="Likely material, or unknown; qualify visual uncertainty")
    identification: Literal["likely", "uncertain", "multiple_items"]
    route: Literal["reuse_first", "check_recycling", "check_compost", "special_dropoff",
                   "general_trash_check", "needs_identification"]
    route_title: str
    disposal_steps: list[str]
    reuse_ideas: list[str]
    reuse_projects: list[ReuseProject] = Field(
        default_factory=list, max_length=5,
        description="Object-specific and safe do-it-yourself reuse projects; empty when inappropriate"
    )
    cautions: list[str]
    follow_up_question: str = Field(description="A useful question if identification or material is uncertain, otherwise empty")
    location_helpful: bool = Field(description="True for material-specific collection or local acceptance checks")
    collection_search_term: str = Field(description="Generic search terms for potential facilities, never a facility name; empty if unneeded")


class InvalidPhoto(Exception):
    pass


class AIUnavailable(Exception):
    def __init__(self, reason: str, status_code: int = 503):
        self.reason = reason
        self.status_code = status_code
        super().__init__(reason)


def configured() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY", "").strip())


def explain_provider_error(code: int | None) -> tuple[str, int]:
    """Return actionable, credential-safe messages; never forward raw provider responses."""
    if code == 429:
        return ("Google Gemini's request limit was reached (HTTP 429). Wait and retry, "
                "or check your Google AI Studio quota.", 429)
    if code == 404:
        return ("Google couldn't find or grant access to this Gemini model (HTTP 404). "
                "Try the other model in Change AI model.", 502)
    if code in (401, 403):
        return ("Google rejected this API key or project permission (HTTP " + str(code) + "). "
                "Check the key and API access in Google AI Studio.", 502)
    if code == 400:
        return ("Google rejected the analysis request (HTTP 400). "
                "The request format or selected model may be incompatible. Try the other model.", 502)
    if code in (500, 502, 503, 504):
        return ("Google Gemini is temporarily unavailable or overloaded (HTTP " + str(code) + "). "
                "Wait a minute, then retry or choose the other AI model.", 502)
    if code is not None:
        return ("Google Gemini returned an error (HTTP " + str(code) + "). "
                "Check your AI Studio project and try again.", 502)
    return ("Google Gemini returned an error without an HTTP status. "
            "Check connectivity and your AI Studio project, then retry.", 502)


def prepare_photo(image_bytes: bytes) -> bytes:
    if not image_bytes or len(image_bytes) > MAX_BYTES:
        raise InvalidPhoto("Use a JPG, PNG or WebP photograph no larger than 8 MB.")
    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
        if image.width < 24 or image.height < 24 or image.width * image.height > MAX_PIXELS:
            raise InvalidPhoto("Image dimensions are unsupported; use a photo under 25 megapixels.")
        oriented = ImageOps.exif_transpose(image).convert("RGB")
        oriented.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        buf = BytesIO()
        oriented.save(buf, format="JPEG", quality=85, optimize=True)
        return buf.getvalue()
    except InvalidPhoto:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise InvalidPhoto("The image could not be opened. Choose a valid JPG, PNG or WebP.") from exc


LANGUAGE_NAMES = {"en": "English", "es": "Spanish", "hi": "Hindi"}


def analyze_photo(
    image_bytes: bytes, model_id: str, object_hint: str = "", language: str = "en"
) -> ItemAnalysis:
    if model_id not in MODELS:
        raise InvalidPhoto("Unsupported AI model selection.")
    if language not in LANGUAGE_NAMES:
        raise InvalidPhoto("Unsupported language.")
    if len(object_hint) > 160:
        raise InvalidPhoto("The object hint must be 160 characters or fewer.")
    if not configured():
        raise AIUnavailable("A Gemini API key is required. Add GEMINI_API_KEY to your local .env file.")
    safe_jpeg = prepare_photo(image_bytes)
    # Deliberately import lazily: app/tests work without the optional provider dependency.
    try:
        from google import genai
        from google.genai import types
        from google.genai.errors import APIError
    except ImportError as exc:
        raise AIUnavailable("Install the AI SDK with: pip install -r backend/requirements.txt") from exc

    user_prompt = (
        "Write the object name, descriptions, directions, reuse projects, materials, "
        "cautions and follow up question in " + LANGUAGE_NAMES[language] + ". "
        "Keep the JSON field keys, enum values including identification and route, "
        "and ReuseProject.difficulty (Easy, Moderate, Advanced) in English. "
        "Write concise, grammatically natural phrasing for that language. "
        "Analyze the photographed object and suggest reuse and safe end-of-life handling. "
        "This is a U.S. household item; local recycling policies have NOT been supplied. "
        + ("Intended item description from user: " + object_hint if object_hint.strip() else
           "If several objects are present, focus on the prominent object only when clear.")
    )
    try:
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        contents = [types.Part.from_bytes(data=safe_jpeg, mime_type="image/jpeg"), user_prompt]
        config = types.GenerateContentConfig(
            system_instruction=PROMPT,
            response_mime_type="application/json",
            response_schema=ItemAnalysis,
            max_output_tokens=4096,
        )
        # One bounded retry for Google-side transient errors. Do not retry 429,
        # rejected credentials, invalid requests, or unknown statuses.
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_id, contents=contents, config=config,
                )
                break
            except APIError as exc:
                if attempt == 0 and getattr(exc, "code", None) in (500, 502, 503, 504):
                    time.sleep(1.0)
                    continue
                raise
        if not response.text:
            raise AIUnavailable("The AI did not return an item analysis. Try another clear photo.", 502)
        analysis = ItemAnalysis.model_validate_json(response.text)
    except APIError as exc:
        reason, status = explain_provider_error(getattr(exc, "code", None))
        raise AIUnavailable(reason, status) from exc
    except (ValueError, ValidationError) as exc:
        raise AIUnavailable("The AI returned an invalid result. Try analyzing the item again.", 502) from exc
    except AIUnavailable:
        raise
    except Exception as exc:
        raise AIUnavailable("Could not reach the AI provider. Check your connection and try again.", 502) from exc

    # Do not manufacture a location or assume every item should be sent to a recycler.
    if not analysis.location_helpful:
        analysis.collection_search_term = ""
    if analysis.identification != "likely":
        # Don't present unsafe projects for objects not identified well enough.
        analysis.reuse_projects = []
        analysis.route = "needs_identification"
        analysis.route_title = "Confirm the item before disposing"
        analysis.location_helpful = False
        analysis.collection_search_term = ""
    return analysis
