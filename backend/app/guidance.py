"""Educational material handling pointers; not a location-specific recycling policy.

Material predictions alone are not sufficient to classify local recycling acceptance.
"""
from typing import TypedDict

class Guidance(TypedDict):
    route: str
    headline: str
    instructions: list[str]
    reuse: list[str]
    finder: str | None
    caution: str
    source_url: str

EPA_RECYCLE = "https://www.epa.gov/recycle/how-do-i-recycle-common-recyclables"
EPA_BATTERIES = "https://www.epa.gov/recycle/used-household-batteries"
EPA_COMPOST = "https://www.epa.gov/recycle/composting-home"

RULES: dict[str, Guidance] = {
    "battery": {
        "route": "special",
        "headline": "Special collection — keep out of ordinary bins",
        "instructions": ["Do not place loose lithium-ion or rechargeable batteries into regular trash or curbside recycling.", "Check the battery type and your local battery drop-off rules. Tape or protect exposed terminals when required by collection instructions."],
        "reuse": ["Reuse only if the battery and device are safe and functioning. Do not attempt to repair a swollen, leaking, or damaged battery."],
        "finder": "battery recycling drop off",
        "caution": "Battery chemistry cannot be determined from a photo. Follow your community's battery handling rules.",
        "source_url": EPA_BATTERIES,
    },
    "glass": {
        "route": "local",
        "headline": "Check glass acceptance in your community",
        "instructions": ["Find out whether your program accepts glass bottles or jars; window glass, mirrors and ceramics often follow different rules.", "Empty containers and follow local preparation instructions before placing anything in a collection bin."],
        "reuse": ["Reuse clean jars for storage when appropriate.", "Donate undamaged reusable glassware."],
        "finder": "glass recycling drop off",
        "caution": "Glass does not automatically mean curbside-recyclable. Acceptance varies by program and item.",
        "source_url": EPA_RECYCLE,
    },
    "metal": {
        "route": "local",
        "headline": "Often recyclable — verify the item",
        "instructions": ["If this is an empty food or beverage can, check your local metal-container rules.", "Keep out sharp, pressurized or hazardous containers unless the receiving program explicitly accepts them."],
        "reuse": ["Repurpose safe, clean metal containers for organization.", "Donate usable metal items rather than throwing them away."],
        "finder": "metal recycling drop off",
        "caution": "The model identifies metal-like waste, not its exact alloy or whether the item is accepted.",
        "source_url": EPA_RECYCLE,
    },
    "organic_waste": {
        "route": "compost",
        "headline": "Consider composting suitable food or garden scraps",
        "instructions": ["Fruit and vegetable scraps, leaves, and many yard trimmings can be suitable for home composting.", "Meat, dairy, oily foods, pet waste and compostable packaging may require different rules or a commercial program."],
        "reuse": ["If safe and edible, prevent food waste before composting.", "Use mature compost to enrich soil or a garden."],
        "finder": None,
        "caution": "Not every organic object is safe for home composting; check the actual item first.",
        "source_url": EPA_COMPOST,
    },
    "paper_cardboard": {
        "route": "local",
        "headline": "Usually recyclable when clean and accepted",
        "instructions": ["Flatten clean cardboard and confirm your local program accepts the material.", "Food-soiled or coated paper may need different handling; remove obvious contamination where required."],
        "reuse": ["Reuse shipping boxes and clean paper before recycling.", "Turn clean cardboard into organizers or craft materials."],
        "finder": "paper cardboard recycling drop off",
        "caution": "The classifier cannot determine coatings, food contamination or local collection acceptance.",
        "source_url": EPA_RECYCLE,
    },
    "plastic": {
        "route": "local",
        "headline": "Recycling depends on the plastic item",
        "instructions": ["Check local acceptance by item shape, material and resin code if present.", "Do not assume the recycling symbol or number guarantees curbside acceptance; empty containers and follow local rules."],
        "reuse": ["Reuse durable containers when safe for their intended purpose.", "Reduce single-use plastic where practical."],
        "finder": "plastic recycling drop off",
        "caution": "A generic plastic classification cannot establish recyclability.",
        "source_url": EPA_RECYCLE,
    },
    "textiles": {
        "route": "reuse",
        "headline": "Reuse, donate or check textile collection",
        "instructions": ["Donate clean, wearable clothing through a suitable organization.", "For worn textiles, check whether a local collection service accepts that material; do not assume curbside acceptance."],
        "reuse": ["Repair, exchange or donate usable clothing.", "Use safe, clean fabric scraps as cleaning rags."],
        "finder": "textile clothing donation recycling",
        "caution": "A textile label does not determine cleanliness, wearability or local program rules.",
        "source_url": EPA_RECYCLE,
    },
    "trash": {
        "route": "trash",
        "headline": "Likely general waste — double-check special items",
        "instructions": ["For ordinary nonhazardous waste, follow your household trash collection instructions.", "Never place batteries, electronics, chemicals, sharps or other hazardous materials in regular trash merely because a classifier says 'trash'."],
        "reuse": ["Before throwing an item away, check whether it can be repaired or reused safely."],
        "finder": None,
        "caution": "The model does not identify hazardous materials reliably. Verify unfamiliar items manually.",
        "source_url": EPA_RECYCLE,
    },
}

CATEGORIES = {
    "battery": "Special drop-off",
    "glass": "Check local recycling",
    "metal": "Check local recycling",
    "organic_waste": "Compost check",
    "paper_cardboard": "Check local recycling",
    "plastic": "Check local recycling",
    "textiles": "Donate / special collection",
    "trash": "General trash check",
}


def guidance_for(label: str) -> Guidance:
    return RULES[label]
