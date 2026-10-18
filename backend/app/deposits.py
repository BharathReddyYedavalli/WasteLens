"""Conservative bottle deposit estimation using published CA and OR rules.

Only the deterministic evaluator calculates refund estimates. Image understanding
extracts possible facts and label text but never decides eligibility or money.
"""
from __future__ import annotations

import os
from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from .vision import AIUnavailable, MODELS, MAX_BYTES, InvalidPhoto, prepare_photo, configured

router = APIRouter(prefix="/api/deposits", tags=["Bottle deposits"])

ALL_STATES = set(
    "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO "
    "MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split()
)
BOTTLE_STATES = {"CA", "CT", "HI", "IA", "ME", "MA", "MI", "NY", "OR", "VT"}
CALIFORNIA_LINK = "https://www2.calrecycle.ca.gov/BevContainer/RecyclingCenters"
OREGON_LINK = "https://bottledrop.com/locations/"

Material = Literal["plastic", "glass", "metal", "carton_pouch", "other", "unknown"]
Beverage = Literal["water", "soda", "beer", "juice", "tea_coffee", "sports",
                   "wine", "spirits", "milk", "other", "unknown"]
LabelStatus = Literal["yes", "no", "unknown"]


class EstimateRequest(BaseModel):
    purchased_state: str = Field(min_length=2, max_length=2)
    material: Material = "unknown"
    beverage: Beverage = "unknown"
    size_oz: float | None = Field(default=None, gt=0, le=256)
    label_visible: LabelStatus = "unknown"
    quantity: int = Field(default=1, ge=1, le=1000)


class LabelImage(BaseModel):
    """Visible evidence only. Absence of a mark in the photo is not absence on bottle."""
    item_name: str = Field(default="Beverage container", max_length=100)
    material: Material = "unknown"
    beverage: Beverage = "unknown"
    size_oz: float | None = Field(default=None, gt=0, le=256)
    visible_refund_text: str = Field(default="", max_length=160)
    observed_details: str = Field(default="", max_length=250)


def estimate_deposit(payload: EstimateRequest) -> dict:
    state = payload.purchased_state.upper()
    if state not in ALL_STATES:
        raise ValueError("Choose a US state where you bought this container.")

    result = {
        "status": "needs_check",
        "per_container_cents": None,
        "estimated_total_cents": None,
        "reason": "",
        "source_title": "Bottle deposit program",
        "source_url": None,
        "steps": [
            "Check the drink and container label before returning it.",
            "Keep the container empty and free of contaminants.",
            "Confirm the location accepts this container before visiting.",
        ],
        "not_verified": True,
    }
    def respond(status: str, message: str, cents: int | None = None) -> dict:
        result["status"], result["reason"] = status, message
        result["per_container_cents"] = cents
        result["estimated_total_cents"] = cents * payload.quantity if cents is not None else None
        return result

    if state not in BOTTLE_STATES:
        return respond("no_program",
                       "This state has no statewide refundable bottle deposit. A CRV or OR marking on a container does not create a local cash refund.")
    if state not in {"CA", "OR"}:
        return respond("program_needs_check",
                       "This state has a bottle deposit program, but WasteLens has not implemented its beverage and container rules. Check your state program before assuming a refund.")

    if state == "CA":
        result.update(source_title="CalRecycle certified redemption centers", source_url=CALIFORNIA_LINK)
        if payload.beverage == "milk":
            return respond("not_covered", "Milk containers are excluded from California CRV.")
        if payload.beverage in {"unknown", "other"}:
            return respond("needs_check", "Confirm what beverage the container originally held.")
        if payload.material == "carton_pouch":
            if payload.beverage in {"wine", "spirits"}:
                cents = 25
            else:
                return respond("not_covered", "Only specific wine and spirit boxes and pouches qualify; ordinary drink cartons do not.")
        elif payload.material in {"plastic", "glass", "metal"}:
            if payload.size_oz is None:
                return respond("needs_check", "Read the container size to determine the California refund amount.")
            cents = 5 if payload.size_oz < 24 else 10
        elif payload.material == "other":
            return respond("not_covered", "This material is not among the listed California refundable container types.")
        else:
            return respond("needs_check", "Confirm whether the container is glass, plastic, metal, or a covered wine or spirits pouch.")

        if payload.label_visible == "no":
            return respond("needs_check", "You indicated the container has no CRV message. Check CalRecycle's limited exemptions for older wine, spirits, and large juice containers; otherwise a refund may be denied.")
        if payload.label_visible == "unknown":
            return respond("possible_refund",
                           "The beverage and size appear covered. Confirm the CRV marking or a labeling exemption, and that it was bought in California. This is an estimate, not a guaranteed payment.",
                           cents)
        return respond("possible_refund",
                       "This may qualify if it was purchased in California and the redemption center accepts it. Final eligibility is checked at redemption.",
                       cents)

    result.update(source_title="Oregon BottleDrop locations", source_url=OREGON_LINK)
    if payload.material == "carton_pouch":
        return respond("not_covered", "Oregon's program excludes cartons, pouches, and drink boxes.")
    if payload.material in {"unknown", "other"}:
        return respond("needs_check", "Check that the container is a sealed glass, plastic, or metal beverage bottle or can.")
    if payload.beverage == "milk":
        return respond("not_covered", "Beverages listing dairy or plant milk as the first ingredient are excluded in Oregon.")
    if payload.beverage in {"spirits", "other", "unknown"}:
        return respond("needs_check" if payload.beverage != "spirits" else "not_covered",
                       "Oregon does not redeem distilled spirits." if payload.beverage == "spirits" else "Check the specific beverage against Oregon's approved list.")
    if payload.size_oz is None:
        return respond("needs_check", "Oregon has beverage-specific size limits. Check the label for the volume.")
    if payload.beverage == "wine":
        if payload.material != "metal":
            return respond("not_covered", "In Oregon, qualifying wine is redeemable in cans, not glass or plastic bottles.")
        if not 4 <= payload.size_oz <= 50.72:
            return respond("not_covered", "Oregon's wine-in-a-can program covers sizes from 4 oz through 1.5 liters.")
    elif payload.beverage in {"water", "soda", "beer"}:
        if payload.size_oz > 101.44:
            return respond("not_covered", "This container exceeds Oregon's 3-liter limit for water, soda or beer.")
    elif payload.beverage in {"juice", "tea_coffee", "sports"}:
        if not 4 <= payload.size_oz <= 50.72:
            return respond("not_covered", "This beverage is outside Oregon's 4 oz through 1.5 liter range.")

    return respond("possible_refund",
                   "Potential 10¢ Oregon deposit. Return eligible empties through a participating store or redemption location. A photo cannot prove the purchase location or acceptance.",
                   10)


@router.post("/check")
def check_deposit(payload: EstimateRequest):
    try:
        return estimate_deposit(payload)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


SCAN_PROMPT = """Describe only the single beverage container visible in this photo.
Extract facts ONLY if printed or visually clear. It might show only a close-up of
the barcode, deposit text, ingredient label, or a container size. Report an
unknown value where evidence is missing. Do not make up product names, size, a
state of purchase or an exact redemption value. Do not infer plastic resin
numbers. The app will decide state-specific eligibility separately.
Return visible_refund_text only when an actual refund mark is legible in this photo;
include the literal visible text, not guesses or a generic recycling symbol.
If size is in mL or liters, convert accurately to US fluid ounces (1 fl oz=29.5735mL)
only when explicitly visible. Otherwise size_oz=null.
Use concise English because output fields are manually editable by the user."""


def scan_label(image: bytes, model_id: str) -> LabelImage:
    if model_id not in MODELS:
        raise ValueError("Invalid AI model.")
    if not configured():
        raise AIUnavailable("Add the Gemini API key to enable photo reading.", 503)
    photo = prepare_photo(image)
    try:
        from google import genai
        from google.genai import types
        from google.genai.errors import APIError
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        response = client.models.generate_content(
            model=model_id,
            contents=[types.Part.from_bytes(data=photo, mime_type="image/jpeg"),
                      "Read the container label and visible packaging details."],
            config=types.GenerateContentConfig(
                system_instruction=SCAN_PROMPT,
                response_mime_type="application/json",
                response_schema=LabelImage,
                max_output_tokens=900,
            ),
        )
        if not response.text:
            raise AIUnavailable("No readable label information was returned. Enter the details manually.", 502)
        return LabelImage.model_validate_json(response.text)
    except APIError as exc:
        status = 429 if getattr(exc, "code", None) == 429 else 502
        raise AIUnavailable("Image reading is unavailable. Enter the label details manually.", status) from exc
    except AIUnavailable:
        raise
    except Exception as exc:
        raise AIUnavailable("Could not read this label. Enter the details manually.", 502) from exc


@router.post("/scan")
async def scan_deposit_label(image: UploadFile = File(...), model_id: str = Form("gemini-3.8-flash")):
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Upload a JPG, PNG or WebP photo.")
    if model_id not in MODELS:
        raise HTTPException(400, "Unsupported AI model.")
    photo = await image.read(MAX_BYTES + 1)
    if len(photo) > MAX_BYTES:
        raise HTTPException(413, "Photo too large. Maximum is 8 MB.")
    try:
        return (await run_in_threadpool(scan_label, photo, model_id)).model_dump()
    except InvalidPhoto as exc:
        raise HTTPException(400, str(exc)) from exc
    except AIUnavailable as exc:
        raise HTTPException(exc.status_code, exc.reason) from exc
