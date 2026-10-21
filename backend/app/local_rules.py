"""Narrow, transparent Frisco residential sorting rules.

These are NOT inferred from Gemini. A person confirms the item category before
checking. School and commercial collections may follow different contracts.
Sources checked October 19, 2026; published policies may change.
"""
from dataclasses import dataclass
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/local-rules", tags=["Local sorting rules"])

CURBSIDE = "https://www.friscotexas.gov/556/Residential-Recycling-Services"
COLLECTION = "https://www.friscotexas.gov/1144/Environmental-Collection-Center"
CHEMICALS = "https://www.friscotexas.gov/487/Household-Chemical-Disposal"
CONTACT = "Frisco Environmental Services: 972-292-5900"

Status = Literal["recycle", "trash", "dropoff", "special", "unverified"]


@dataclass(frozen=True)
class Rule:
    label: str
    status: Status
    direction: str
    source_url: str


RULES: dict[str, Rule] = {
    "plastic_bottle_jug": Rule(
        "Plastic bottle or jug", "recycle",
        "Frisco lists plastic bottles and jugs in residential blue-cart recycling. Empty, clean and dry.",
        CURBSIDE),
    "aluminum_steel_can": Rule(
        "Aluminum or steel food/drink can", "recycle",
        "Frisco lists aluminum and steel cans in residential blue-cart recycling. Empty, clean and dry.",
        CURBSIDE),
    "glass_bottle_jar": Rule(
        "Glass bottle or jar", "recycle",
        "Frisco accepts glass bottles and jars in the residential blue cart when empty, clean and dry. Drinking glasses are not accepted.",
        CURBSIDE),
    "cardboard_box": Rule(
        "Cardboard box", "recycle",
        "Frisco accepts cardboard boxes in residential blue-cart recycling. Empty, clean and dry.",
        CURBSIDE),
    "paperboard_box": Rule(
        "Cereal or dry-food paperboard box", "recycle",
        "Frisco lists cereal boxes and other dry-food boxes as residential recyclables. Empty, clean and dry.",
        COLLECTION),
    "paper_mail": Rule(
        "Mail, paper or newspaper", "recycle",
        "Frisco accepts mail, paper and newspapers in the residential blue cart when clean and dry.",
        CURBSIDE),
    "plastic_clamshell": Rule(
        "Plastic clamshell food container", "trash",
        "Frisco explicitly lists clamshell containers among items that must not go in residential blue-cart recycling.",
        CURBSIDE),
    "paper_coffee_cup": Rule(
        "Paper coffee cup", "trash",
        "Frisco explicitly lists paper coffee cups among items that must not go in residential blue-cart recycling.",
        CURBSIDE),
    "beverage_carton": Rule(
        "Milk, juice or other beverage carton", "trash",
        "Frisco explicitly lists beverage cartons among items that must not go in residential blue-cart recycling.",
        CURBSIDE),
    "tissue_paper": Rule(
        "Used tissue", "trash",
        "Frisco explicitly lists tissues among items that must not go in residential blue-cart recycling.",
        CURBSIDE),
    "plastic_bags_film": Rule(
        "Clean plastic bags or film", "dropoff",
        "Do not put plastic bags or film in the blue cart. Frisco lists clean, eligible bags and film for separate collection at its Environmental Collection Center; some multilayer bags are excluded.",
        COLLECTION),
    "styrofoam_packaging": Rule(
        "Styrofoam packaging", "dropoff",
        "Do not put Styrofoam in the blue cart. Frisco has a separate packaging-foam drop-off with material restrictions at its Environmental Collection Center.",
        COLLECTION),
    "alkaline_household_battery": Rule(
        "Household AA/AAA/C/D battery", "dropoff",
        "Frisco provides a separate collection receptacle for standard household batteries at its Environmental Collection Center. Rechargeable and lithium-ion batteries have different handling guidance.",
        COLLECTION),
    "lithium_ion_battery": Rule(
        "Lithium-ion or rechargeable battery", "special",
        "Keep out of household blue carts and trash. Follow Frisco's battery-safety instructions and size limits; larger lithium batteries may require special collection hours. Confirm before visiting.",
        CHEMICALS),
    "electronics": Rule(
        "Computer, phone or other electronics", "special",
        "Frisco directs eligible residents to its Household Chemical and Electronics Disposal service during special collection hours. Residency documentation and quantity limits apply.",
        CHEMICALS),
    "household_chemicals": Rule(
        "Paint, cleaner or household chemical", "special",
        "Do not put hazardous household chemicals in the blue cart or ordinary trash. Frisco has an eligible-resident household-chemical drop-off with specified hours and restrictions.",
        CHEMICALS),
    "paper_plate": Rule(
        "Disposable paper plate", "unverified",
        "The reviewed Frisco curbside list does not explicitly specify disposable paper plates. Do not assume the blue cart accepts this item. Confirm material and local policy.",
        CURBSIDE),
    "plastic_cutlery": Rule(
        "Plastic fork, spoon or knife", "unverified",
        "The reviewed Frisco curbside list does not explicitly specify plastic utensils. Do not assume the blue cart accepts them. Ask the city for item-specific guidance.",
        CURBSIDE),
    "other": Rule(
        "Another or uncertain item", "unverified",
        "This item is outside the verified categories. A recycling symbol or nearby collection center alone does not confirm local acceptance.",
        CURBSIDE),
}

STATUS_LABELS = {
    "recycle": "Residential blue cart",
    "trash": "Not accepted in blue cart",
    "dropoff": "Separate city drop-off",
    "special": "Special collection",
    "unverified": "Not confirmed",
}


@router.get("/frisco/categories")
def frisco_categories():
    return {
        "program": "Frisco residential collection",
        "scope": "City residential guidance, NOT school or commercial recycling.",
        "categories": [
            {"id": code, "label": rule.label} for code, rule in RULES.items()
        ],
    }


@router.get("/frisco/check")
def check_frisco(
    category: str = Query(min_length=1, max_length=64),
    context: Literal["residential", "school", "commercial"] = "residential",
):
    rule = RULES.get(category)
    if rule is None:
        raise HTTPException(status_code=422, detail="Choose a listed item category.")

    if context != "residential":
        return {
            "category": category,
            "item_name": rule.label,
            "status": "unverified",
            "status_label": "Not confirmed",
            "direction": "Frisco residential rules do not establish what a school or business's waste contractor accepts. Confirm that facility's collection agreement before sorting.",
            "source_url": CURBSIDE,
            "scope": "School/commercial collection: no verified rule",
            "contact": CONTACT,
            "verified_scope_only": True,
        }

    return {
        "category": category,
        "item_name": rule.label,
        "status": rule.status,
        "status_label": STATUS_LABELS[rule.status],
        "direction": rule.direction,
        "source_url": rule.source_url,
        "scope": "Frisco residential collection only",
        "contact": CONTACT,
        "verified_scope_only": True,
    }
