"""Optional photo helper to prefill the bottle deposit checker.

Photo OCR is not proof of deposit payment, product registration or state
eligibility. The user must verify beverage, material, capacity and purchase
state before using the deterministic rules calculator.
"""
import os
from typing import Literal

from google.genai.errors import APIError
from pydantic import BaseModel, Field, ValidationError

from .vision import AIUnavailable, DEFAULT_MODEL, InvalidPhoto, prepare_photo

class DepositPhotoSuggestion(BaseModel):
    drink: Literal["soda","water","sparkling_water","beer","cider","juice",
                   "sports_energy","coffee_tea","wine","liquor","mixed_alcohol","milk","other"]
    material: Literal["aluminum","glass","plastic","carton","pouch","other"]
    resin: Literal["pet1","hdpe2","other","unknown"] = "unknown"
    ounces: float | None = Field(default=None, ge=0, le=512)
    visible_mark: str = Field(default="", max_length=70)
    confidence: Literal["clear","uncertain"] = "uncertain"
    guidance: str = Field(max_length=200)


def inspect_deposit_photo(data: bytes) -> DepositPhotoSuggestion:
    if not os.environ.get("GEMINI_API_KEY", "").strip():
        raise AIUnavailable("Gemini is not configured. Enter bottle details manually.")
    jpeg = prepare_photo(data)
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        response = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=[
                types.Part.from_bytes(data=jpeg,mime_type="image/jpeg"),
                "Extract ONLY visible beverage container details for a deposit checker. "
                "Choose a category and material, or 'other' if uncertain. "
                "Return size in US fluid ounces only if legible. "
                "Set resin 'unknown' unless PET #1 or HDPE #2 can be read clearly. "
                "For visible_mark copy only exact printed state/refund text you can read. "
                "Never infer that a state deposit was actually paid. "
                "No state refund value, venue, or eligibility guesses. "
                "Write brief everyday English guidance when uncertain."
            ],
            config=types.GenerateContentConfig(
                system_instruction="You are a cautious label reader. Never invent text not visible in the photo.",
                response_mime_type="application/json",
                response_schema=DepositPhotoSuggestion,
                max_output_tokens=650,
            )
        )
        if not response.text:
            raise AIUnavailable("Could not read the label. Try a closer photo.", 502)
        return DepositPhotoSuggestion.model_validate_json(response.text)
    except APIError as exc:
        raise AIUnavailable("The photo reader is unavailable. Enter details manually.", 502) from exc
    except (ValidationError, ValueError) as exc:
        raise AIUnavailable("The photo reader could not interpret the label.", 502) from exc
    except AIUnavailable:
        raise
    except ImportError as exc:
        raise AIUnavailable("Install backend AI requirements to scan labels.", 503) from exc
    except Exception as exc:
        raise AIUnavailable("Could not read that photo. Try entering the details manually.", 502) from exc
