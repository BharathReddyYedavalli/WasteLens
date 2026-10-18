"""Small curated list of actual public recycling drop-offs, for provider outages.

This is deliberately not a fictional nationwide dataset. Entries must have an
official, currently published source URL and real, externally documented map
coordinates. Approximate pins are clearly described as approximate. Material
acceptance for a particular scanned item is never guaranteed.

Sources checked 2026-10-18:
Frisco: https://www.friscotexas.gov/1144/Environmental-Collection-Center
Plano: https://www.plano.gov/recycling-drop-off-locations
Pin coordinates from https://junkscout.io/facility/f_manual_5bd8288de838/
and https://recyclefind.com/listings/republic-services-plano-recycling-facility-plano-tx-4219
"""
from __future__ import annotations

from typing import Callable

OFFICIAL_SITES = (
    {
        "id": "official-frisco-ecc",
        "name": "Frisco Environmental Collection Center",
        "address": "6616 Walnut Street, Frisco, TX 75033",
        "latitude": 33.153328850148,
        "longitude": -96.827890128468,
        "kind": "center",
        "phone": "972-292-5900",
        "tagged_materials": [
            "Cardboard", "Paper", "Plastic bottles", "Glass", "Household batteries",
            "Electronics during special collection hours",
        ],
        "source_url": "https://www.friscotexas.gov/1144/Environmental-Collection-Center",
        "access_note": (
            "General recycling and specialty collection have different hours. "
            "Electronics and chemicals require proof of eligible Frisco residency. "
            "Check the city's rules for the item and visit time."
        ),
    },
    {
        "id": "official-plano-republic",
        "name": "Republic Services Recycling Drop Off",
        "address": "4200 E. 14th Street, Plano, TX 75074",
        "latitude": 33.011863,
        "longitude": -96.651917,
        "kind": "center",
        "phone": "972-422-2341",
        "tagged_materials": [],
        "source_url": "https://www.plano.gov/recycling-drop-off-locations",
        "access_note": (
            "The City of Plano lists this as its public recycling drop off location. "
            "Contact the facility to check which materials it accepts."
        ),
    },
)


def nearby_official_sites(
    latitude: float, longitude: float, max_miles: float, distance_km: Callable
) -> list[dict]:
    """Return only real, source-linked entries within the requested radius."""
    results = []
    for site in OFFICIAL_SITES:
        miles = distance_km(latitude, longitude, site["latitude"], site["longitude"]) * 0.621371
        if miles > max_miles:
            continue
        entry = dict(site)
        entry.update({
            "distance_miles": round(miles, 1),
            "verified_acceptance": False,
            "listing_source": "official",
            "coordinate_note": "Map pin approximate. Confirm address before visiting.",
            "note": (
                "Listed by the local government, but acceptance of your exact item "
                "and current hours have not been independently confirmed."
            ),
        })
        results.append(entry)
    return sorted(results, key=lambda entry: entry["distance_miles"])
