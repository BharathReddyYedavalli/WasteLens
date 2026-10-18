"""WasteLens: in-page collection-location discovery using community OpenStreetMap data.

All ZIP coordinates come from a bundled postal-code database (no geocoding
network call per search); these are approximate. Recycling POIs come only from
actual OSM Overpass responses. No fabricated business listings or acceptance.
"""
from __future__ import annotations

import json
import math
import re
import time
from functools import lru_cache
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import zipcodes
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api")
OVERPASS_SERVERS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.osm.jp/api/interpreter",
)


def fetch_json(url: str, data: bytes | None = None, timeout: float = 15):
    request = Request(
        url, data=data,
        headers={
            "User-Agent": "WasteLensStudentProject/0.4 (+https://github.com/BharathReddyYedavalli/WasteLens)",
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST" if data is not None else "GET",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
        raise HTTPException(503, "The community recycling-location provider is temporarily unavailable.") from exc


@lru_cache(maxsize=1000)
def resolve_zip(zip_code: str) -> tuple[float, float, str]:
    """Offline ZIP lookup; not an address or a confirmation of postal validity."""
    matches = zipcodes.matching(zip_code)
    for match in matches:
        try:
            lat = float(match["lat"])
            lon = float(match["long"])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
            label = ", ".join(part for part in (match.get("city"), match.get("state")) if part)
            return lat, lon, label or zip_code
        except (ValueError, TypeError, KeyError):
            continue
    raise HTTPException(
        404, "We couldn't locate coordinates for that ZIP in the offline postal dataset. "
        "Check the five digits or try a nearby ZIP. This does not prove it is invalid."
    )


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371.0088
    a = math.sin(math.radians(lat2 - lat1) / 2) ** 2 + (
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
        * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    )
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


@lru_cache(maxsize=200)
def _query_overpass(center_lat: float, center_lng: float, quarter_hour: int, radius_m: int = 20000) -> dict:
    # Cache searches for approx. 15 min so our student prototype doesn't
    # needlessly overload volunteer-operated Overpass community servers.
    query = (
        "[out:json][timeout:20];("
        f'nwr(around:{radius_m},{center_lat:.6f},{center_lng:.6f})["amenity"="recycling"];'
        f'nwr(around:{radius_m},{center_lat:.6f},{center_lng:.6f})["shop"="recycling"];'
        f'nwr(around:{radius_m},{center_lat:.6f},{center_lng:.6f})["recycling:electrical_items"="yes"];'
        f'nwr(around:{radius_m},{center_lat:.6f},{center_lng:.6f})["recycling:batteries"="yes"];'
        ");out center 250;"
    )
    body = urlencode({"data": query}).encode("utf-8")
    for endpoint in OVERPASS_SERVERS:
        try:
            result = fetch_json(endpoint, data=body, timeout=24)
            if isinstance(result, dict) and isinstance(result.get("elements"), list):
                return result
        except HTTPException:
            continue
    raise HTTPException(503, "Both community recycling-location providers are unavailable.")


def _parse_facilities(data: dict, center_lat: float, center_lng: float) -> list[dict]:
    results = []
    visited = set()
    material_tags = (
        ("recycling:electrical_items", "Electronics"),
        ("recycling:computers", "Computers"),
        ("recycling:small_appliances", "Small appliances"),
        ("recycling:batteries", "Batteries"),
        ("recycling:glass", "Glass"),
        ("recycling:paper", "Paper"),
        ("recycling:plastic", "Plastic"),
        ("recycling:metal", "Metal"),
        ("recycling:clothes", "Clothing"),
        ("recycling:cardboard", "Cardboard"),
    )
    for entry in data.get("elements", []):
        feature_type, feature_id = entry.get("type"), entry.get("id")
        if (feature_type, feature_id) in visited or feature_type not in ("node", "way", "relation"):
            continue
        coords = entry if "lat" in entry else entry.get("center", {})
        try:
            lat, lng = float(coords["lat"]), float(coords["lon"])
        except (KeyError, ValueError, TypeError):
            continue
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            continue
        tags = entry.get("tags") or {}
        if tags.get("access") in ("private", "no") or tags.get("disused") == "yes":
            continue
        is_center = tags.get("recycling_type") == "centre" or tags.get("shop") == "recycling"
        kind = "center" if is_center else "drop_off"
        name = tags.get("name") or tags.get("operator") or (
            "Recycling center (unnamed)" if is_center else "Recycling drop-off point (unnamed)"
        )
        street = " ".join(filter(None, (tags.get("addr:housenumber"), tags.get("addr:street"))))
        address = ", ".join(str(v) for v in (
            street, tags.get("addr:city"), tags.get("addr:state"), tags.get("addr:postcode")
        ) if v) or "Street address not provided"
        materials = [label for key, label in material_tags if tags.get(key) == "yes"]
        # Only show contact data specifically available from OSM; it has not
        # been independently verified and may be outdated.
        phone = str(tags.get("contact:phone") or tags.get("phone") or "").strip()[:50]
        results.append({
            "id": f"{feature_type}-{feature_id}",
            "name": str(name)[:160],
            "kind": kind,
            "address": address[:250],
            "latitude": lat,
            "longitude": lng,
            "distance_miles": round(distance_km(center_lat, center_lng, lat, lng) * 0.621371, 1),
            "tagged_materials": materials,
            "phone": phone,
            "verified_acceptance": False,
            "note": "Community-mapped location. Materials, phone and opening hours are not verified.",
        })
        visited.add((feature_type, feature_id))
    return sorted(results, key=lambda x: x["distance_miles"])[:60]


@router.get("/facilities")
def facilities(zip_code: str = Query(min_length=5, max_length=5)):
    """Return an approximate ZIP-centered map even if the live POI feed fails."""
    if not re.fullmatch(r"\d{5}", zip_code):
        raise HTTPException(422, "Enter a five-digit US ZIP code.")
    center_lat, center_lng, label = resolve_zip(zip_code)
    error = None
    radius_miles = 12.4
    try:
        lat, lng, slot = round(center_lat, 6), round(center_lng, 6), int(time.time() // 900)
        data = _query_overpass(lat, lng, slot, radius_m=20000)
        matches = _parse_facilities(data, center_lat, center_lng)
        if not matches:
            # Many US suburbs have no mapped recycling points inside 12 miles.
            # Search a wider area rather than incorrectly implying none exist.
            wider_data = _query_overpass(lat, lng, slot, radius_m=45000)
            matches = _parse_facilities(wider_data, center_lat, center_lng)
            radius_miles = 28.0
        listing_status = "ok" if matches else "no_results"
    except HTTPException:
        # A failed response is not the same as an area without recycling sites.
        matches = []
        listing_status = "unavailable"
        error = "OpenStreetMap location listings are currently unavailable. The map still works; please retry later."
    return {
        "zip_code": zip_code,
        "location_label": label,
        "center": {"latitude": center_lat, "longitude": center_lng},
        "facilities": matches,
        "radius_miles": radius_miles,
        "listing_status": listing_status,
        "provider": "OpenStreetMap community data",
        "acceptance_verified": False,
        "notice": error or (
            "Mapped places are potential collection options, not verified acceptors of your item. "
            "Some recycling businesses may be missing from OpenStreetMap. Contact a location before visiting."
        ),
    }
