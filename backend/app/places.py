"""In-page local collection finder using OpenStreetMap's community places data.

ZIP lookup and Overpass search happen server-side. We only return actual mapped
features; never invent facilities or claim they accept a particular material.
Availability and material acceptance need independent verification.
"""
from __future__ import annotations

import json
import math
from functools import lru_cache
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api")


def fetch_json(url: str, data: bytes | None = None, timeout: float = 12, zip_lookup: bool = False):
    request = Request(
        url, data=data,
        headers={
            "User-Agent": "WasteLensStudentProject/0.3 (noncommercial map discovery)",
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST" if data is not None else "GET",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except HTTPError as exc:
        if exc.code == 404 and zip_lookup:
            raise HTTPException(404, "ZIP was not listed by the primary community directory.") from exc
        raise HTTPException(503, "The map data provider is temporarily unavailable.") from exc
    except (URLError, TimeoutError, ValueError, OSError) as exc:
        raise HTTPException(503, "Could not reach the map provider. Try again shortly.") from exc


@lru_cache(maxsize=300)
def resolve_zip(zip_code: str) -> tuple[float, float, str]:
    """Low-volume ZIP lookup; missing provider records are not proof a ZIP is invalid."""
    try:
        location = fetch_json(f"https://api.zippopotam.us/us/{zip_code}", zip_lookup=True)
        places = location.get("places") or []
        if places:
            item = places[0]
            return (
                float(item["latitude"]), float(item["longitude"]),
                ", ".join(part for part in (item.get("place name"), item.get("state abbreviation")) if part)
            )
    except HTTPException as exc:
        if exc.status_code != 404:
            raise

    # Nominatim is a low-volume fallback; cache hits to avoid repeat requests.
    result = fetch_json(
        "https://nominatim.openstreetmap.org/search?" +
        urlencode({"postalcode": zip_code, "country": "United States", "format": "json", "limit": "1"}),
        timeout=12,
    )
    if isinstance(result, list) and result:
        row = result[0]
        return float(row["lat"]), float(row["lon"]), str(row.get("display_name", zip_code))[:120]
    raise HTTPException(
        404, "Our community directory could not locate this ZIP; that does not "
        "mean it is invalid. Use Google Maps or try a nearby ZIP."
    )


def distance_km(lat1, lng1, lat2, lng2):
    radius = 6371.0088
    a = math.sin(math.radians(lat2 - lat1) / 2) ** 2 + (
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
        * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    )
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


@router.get("/facilities")
def facilities(zip_code: str = Query(min_length=5, max_length=5)):
    """Search genuinely mapped nearby recycling facilities by US ZIP centroid."""
    if not re.fullmatch(r"\d{5}", zip_code):
        raise HTTPException(422, "Enter a five-digit US ZIP code.")
    center_lat, center_lng, location_label = resolve_zip(zip_code)
    # The ZIP centroid is approximate, not a precise address or personal location.
    # OSM's tags do NOT verify that a business accepts the photographed item.
    query = (
        "[out:json][timeout:20];("
        f'nwr(around:20000,{center_lat:.6f},{center_lng:.6f})["amenity"="recycling"];'
        f'nwr(around:20000,{center_lat:.6f},{center_lng:.6f})["shop"="recycling"];'
        f'nwr(around:20000,{center_lat:.6f},{center_lng:.6f})["recycling:electrical_items"="yes"];'
        f'nwr(around:20000,{center_lat:.6f},{center_lng:.6f})["recycling:batteries"="yes"];'
        ");out center 250;"
    )
    # Public Overpass availability varies; return an explicit error instead of fake data.
    data = fetch_json(
        "https://overpass.kumi.systems/api/interpreter",
        data=urlencode({"data": query}).encode("utf-8"),
        timeout=26,
    )
    results = []
    visited = set()
    for entry in data.get("elements", []):
        feature_type = entry.get("type", "")
        feature_id = entry.get("id")
        if (feature_type, feature_id) in visited:
            continue
        point = entry if "lat" in entry else entry.get("center", {})
        try:
            lat, lng = float(point["lat"]), float(point["lon"])
        except (KeyError, ValueError, TypeError):
            continue
        tags = entry.get("tags", {})
        if tags.get("access") in ("private", "no") or tags.get("disused") == "yes":
            continue
        name = tags.get("name") or tags.get("operator") or "Mapped recycling location"
        address_parts = [
            " ".join(filter(None, [tags.get("addr:housenumber"), tags.get("addr:street")])).strip(),
            tags.get("addr:city", ""), tags.get("addr:state", ""),
            tags.get("addr:postcode", ""),
        ]
        address = ", ".join(value for value in address_parts if value) or "Street address not listed"
        materials = [
            label for tag, label in (
                ("recycling:electrical_items", "Electronics"),
                ("recycling:computers", "Computers"),
                ("recycling:small_appliances", "Small appliances"),
                ("recycling:batteries", "Batteries"),
                ("recycling:glass", "Glass"),
                ("recycling:paper", "Paper"),
                ("recycling:plastic", "Plastic"),
                ("recycling:metal", "Metal"),
            )
            if tags.get(tag) == "yes"
        ]
        results.append({
            "id": f"{feature_type}-{feature_id}",
            "name": str(name)[:160],
            "address": address[:250],
            "latitude": lat,
            "longitude": lng,
            "distance_miles": round(distance_km(center_lat, center_lng, lat, lng) * 0.621371, 1),
            "tagged_materials": materials,
            "verified_acceptance": False,
            "note": "Mapped as a potential collection location. Item acceptance and hours are not verified.",
        })
        visited.add((feature_type, feature_id))
    results.sort(key=lambda x: x["distance_miles"])
    return {
        "zip_code": zip_code,
        "location_label": location_label,
        "center": {"latitude": center_lat, "longitude": center_lng},
        "facilities": results[:60],
        "provider": "OpenStreetMap community data",
        "acceptance_verified": False,
        "notice": "These are mapped potential facilities, not confirmed drop-off options for your exact item. Contact a facility before visiting.",
    }
