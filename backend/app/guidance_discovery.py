"""Safe nationwide discovery for ZIPs without a documented residential program.

A postal location is NOT a collection authority. This endpoint never returns a
local acceptance decision and makes no network calls. Source links are official
EPA references or state-agency homepages linked from EPA's directory (reviewed
2026-10-21); a search link is separately and explicitly NOT an official source.
"""
from __future__ import annotations

import re
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Query

from .places import resolve_zip
from .program_rules import CATEGORY_LABELS, Context

router = APIRouter(prefix="/api/local-rules", tags=["Local sorting rules"])

EPA_DIRECTORY = "https://www.epa.gov/aboutepa/health-and-environmental-agencies-us-states-and-territories"
EPA_COMMON = "https://www.epa.gov/recycle/how-do-i-recycle-common-recyclables"
EPA_BATTERIES = "https://www.epa.gov/recycle/used-household-batteries"
EPA_LITHIUM = "https://www.epa.gov/recycle/used-lithium-ion-batteries"
EPA_ELECTRONICS = "https://www.epa.gov/recycle/electronics-donation-and-recycling"
EPA_LOCAL = "https://www.epa.gov/recycle/forms/contact-us-about-reduce-reuse-recycle"

# Official state-agency homepages linked by the EPA directory.
# These are places to begin looking, NOT claims that the state accepts the item.
STATE_AGENCIES = {
    "AZ": ("Arizona Department of Environmental Quality", "https://www.azdeq.gov/"),
    "CA": ("CalRecycle", "https://calrecycle.ca.gov/"),
    "CO": ("Colorado Department of Public Health & Environment", "https://cdphe.colorado.gov/"),
    "FL": ("Florida Department of Environmental Protection", "https://floridadep.gov/"),
    "GA": ("Georgia Environmental Protection Division", "https://epd.georgia.gov/"),
    "IL": ("Illinois Environmental Protection Agency", "https://epa.illinois.gov/"),
    "NJ": ("New Jersey Department of Environmental Protection", "https://dep.nj.gov/"),
    "NY": ("New York Department of Environmental Conservation", "https://dec.ny.gov/"),
    "NC": ("North Carolina Department of Environmental Quality", "https://www.deq.nc.gov/"),
    "OR": ("Oregon Department of Environmental Quality", "https://www.oregon.gov/deq/"),
    "TX": ("Texas Commission on Environmental Quality", "https://www.tceq.texas.gov/"),
    "WA": ("Washington Department of Ecology", "https://ecology.wa.gov/"),
}
SPECIAL_GUIDES = {
    "alkaline_household_battery": ("EPA: Household battery handling", EPA_BATTERIES),
    "lithium_ion_battery": ("EPA: Lithium-ion battery safety", EPA_LITHIUM),
    "electronics": ("EPA: Electronics donation and recycling", EPA_ELECTRONICS),
}

def _official(label: str, url: str) -> dict:
    return {"label": label, "url": url, "kind": "official_reference"}

@router.get("/discovery")
def discover_local_guidance(
    zip_code: str = Query(min_length=5, max_length=5),
    category: str = Query(min_length=1, max_length=64),
    context: Context = "residential",
):
    """Find reputable starting points; never infer any collection-bin eligibility."""
    if not re.fullmatch(r"[0-9]{5}", zip_code):
        raise HTTPException(422, "Enter a five-digit US ZIP code.")
    if category not in CATEGORY_LABELS:
        raise HTTPException(422, "Choose a listed item category.")
    _, _, postal_area = resolve_zip(zip_code)
    state = postal_area.rsplit(",", 1)[-1].strip().upper() if "," in postal_area else ""
    material = CATEGORY_LABELS[category]

    links = []
    if state in STATE_AGENCIES:
        agency, agency_url = STATE_AGENCIES[state]
        links.append(_official(agency + " (state agency)", agency_url))
    links.append(_official("EPA: State environmental agency directory", EPA_DIRECTORY))
    guide_name, guide_url = SPECIAL_GUIDES.get(
        category, ("EPA: Common recyclables guide", EPA_COMMON))
    links.append(_official(guide_name, guide_url))
    links.append(_official("EPA: How to find your local collection authority", EPA_LOCAL))

    if category == "lithium_ion_battery":
        next_step = (
            "Do not put lithium-ion batteries in household trash or recycling carts. "
            "Look for a dedicated battery recycling or household hazardous-waste program, "
            "and follow the EPA's battery-handling precautions."
        )
    elif category in ("alkaline_household_battery", "electronics", "household_chemicals"):
        next_step = (
            "Check the official handling guidance and contact your collection provider "
            "about a dedicated drop-off or special program before bringing this item."
        )
    else:
        next_step = (
            "Ask your actual waste collection provider whether this exact item is "
            "accepted, in which bin, and how it needs to be prepared."
        )

    if context != "residential":
        next_step = (
            "School and business collection rules may be different from household "
            "services. Ask the site manager or contracted waste hauler about this item. "
        ) + next_step

    # Discovery-only search. Results belong to a third-party engine and have
    # not been screened or verified by WasteLens.
    query = f'{postal_area} recycling waste collection official city county rules {material}'
    if context != "residential":
        query += " " + ("school" if context == "school" else "business")
    search_url = "https://www.google.com/search?" + urlencode({"q": query[:230]})

    return {
        "zip_code": zip_code,
        "postal_area": postal_area,
        "state": state or None,
        "category": category,
        "item_name": material,
        "context": context,
        "status": "unverified",
        "local_acceptance_verified": False,
        "documented_program_rule": False,
        "next_step": next_step,
        "disclaimer": (
            "ZIP city and state are only postal hints, not proof of your service "
            "area. These resources do not verify item acceptance, opening hours, "
            "or eligibility. Check the rules of your real hauler, city, county, "
            "school or building before sorting or travelling."
        ),
        "official_links": links,
        "local_search": {
            "label": "Search for a local collection authority (results not verified)",
            "url": search_url,
            "kind": "unverified_web_search",
        },
    }
