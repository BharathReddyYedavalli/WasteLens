"""Source-backed, explicitly scoped municipal residential sorting catalog.

Coverage is intentionally limited. ZIP *postal names* are hints, not proof
of municipal boundaries, eligibility, waste contractor or school collection.
Every supported result requires the user's confirmation of their service.
Never infer program acceptance from Gemini or an OpenStreetMap map listing.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from .local_rules import RULES as FRISCO_RULES, Rule as SortingRule
from .places import resolve_zip

router = APIRouter(prefix="/api/local-rules", tags=["Local sorting rules"])

PROGRAMS = {
    "frisco_tx": {
        "name": "City of Frisco residential blue cart",
        "city": "Frisco", "state": "TX",
        "source_url": "https://www.friscotexas.gov/556/Residential-Recycling-Services",
    },
    "mckinney_tx": {
        "name": "City of McKinney residential blue cart",
        "city": "McKinney", "state": "TX",
        "source_url": "https://www.mckinneytexas.org/792/Recycling",
    },
    "san_francisco_ca": {
        "name": "Recology San Francisco three-cart service",
        "city": "San Francisco", "state": "CA",
        "source_url": "https://www.recology.com/recology-san-francisco/what-goes-where/",
    },
    "los_angeles_ca": {
        "name": "LA Sanitation single-family curbside program",
        "city": "Los Angeles", "state": "CA",
        "source_url": "https://sanitation.lacity.gov/services/single-family-residents",
    },
}

MCKINNEY = PROGRAMS["mckinney_tx"]["source_url"]
SF = PROGRAMS["san_francisco_ca"]["source_url"]
LA = PROGRAMS["los_angeles_ca"]["source_url"]
LA_HAZARD = "https://sanitation.lacity.gov/programs/safe-centers-and-household-hazardous-waste"
LA_TRASH = "https://sanitation.lacity.gov/services/weekly-curbside-black-bin-collection-trash"


def rule(label: str, status: str, instruction: str, source: str) -> SortingRule:
    return SortingRule(label, status, instruction, source)


# Only explicitly documented items are given an acceptance status.
# Other item types retain an "unverified" response, NOT Frisco's rules.
MCKINNEY_RULES = {
    "plastic_bottle_jug": rule("Plastic bottle or jug", "recycle", "McKinney accepts empty plastic containers marked #1, #2, #4, or #5 in residential blue carts. Confirm the resin code and empty the container.", MCKINNEY),
    "aluminum_steel_can": rule("Aluminum or steel food/drink can", "recycle", "McKinney accepts empty aluminum, steel and tin cans in its residential recycling cart.", MCKINNEY),
    "glass_bottle_jar": rule("Glass bottle or jar", "recycle", "McKinney accepts empty glass bottles and jars in its residential blue cart.", MCKINNEY),
    "cardboard_box": rule("Cardboard box", "recycle", "McKinney accepts cardboard. Flatten boxes and keep them free of food and liquids.", MCKINNEY),
    "paperboard_box": rule("Cereal or dry-food paperboard box", "recycle", "McKinney accepts empty paperboard boxes in residential recycling.", MCKINNEY),
    "paper_mail": rule("Mail, paper or newspaper", "recycle", "McKinney accepts clean paper, mail, newspapers and magazines in residential recycling.", MCKINNEY),
    "beverage_carton": rule("Milk, juice or other beverage carton", "trash", "McKinney lists juice and milk cartons among materials not accepted in the residential blue cart.", MCKINNEY),
    "plastic_bags_film": rule("Clean plastic bags or film", "unverified", "Plastic film and bags are not accepted in McKinney's blue cart. The city's guide does not establish acceptance in a separate program for your item. Confirm a drop-off before visiting.", MCKINNEY),
    "styrofoam_packaging": rule("Styrofoam packaging", "unverified", "Styrofoam is not accepted in McKinney's blue cart. Consult the city's separate collection guidance for any alternative.", MCKINNEY),
    "alkaline_household_battery": rule("Household AA/AAA/C/D battery", "unverified", "Batteries are not accepted in McKinney's blue cart. Verify a suitable battery collection option before transport.", MCKINNEY),
    "lithium_ion_battery": rule("Lithium-ion or rechargeable battery", "unverified", "Batteries are not accepted in McKinney's blue cart. Check safe collection requirements for this battery type; do not put it in the blue cart.", MCKINNEY),
    "electronics": rule("Computer, phone or other electronics", "unverified", "McKinney excludes electronics from its residential blue cart. Check the official city's special collection guidance for your device.", MCKINNEY),
    "household_chemicals": rule("Paint, cleaner or household chemical", "unverified", "McKinney excludes household hazardous waste from the recycling cart. Check the city's hazardous-waste program and safety restrictions.", MCKINNEY),
}

SF_RULES = {
    "plastic_bottle_jug": rule("Plastic bottle or jug", "recycle", "Recology San Francisco accepts empty plastic bottles in the blue recycling cart. Rinse away food and liquids.", SF),
    "aluminum_steel_can": rule("Aluminum or steel food/drink can", "recycle", "Recology San Francisco accepts clean aluminum and steel cans in the blue recycling cart.", SF),
    "glass_bottle_jar": rule("Glass bottle or jar", "recycle", "Recology San Francisco accepts empty glass bottles and jars in the blue recycling cart.", SF),
    "cardboard_box": rule("Cardboard box", "recycle", "Recology San Francisco accepts clean, dry cardboard in the blue recycling cart.", SF),
    "paperboard_box": rule("Cereal or dry-food paperboard box", "recycle", "Recology San Francisco accepts clean, dry cereal and paperboard boxes in the blue recycling cart.", SF),
    "paper_mail": rule("Mail, paper or newspaper", "recycle", "Recology San Francisco accepts clean, dry mail, newspapers and paper in the blue recycling cart.", SF),
    "plastic_clamshell": rule("Plastic clamshell food container", "recycle", "Recology San Francisco accepts clean, empty plastic clamshell containers in the blue recycling cart. Remove food and liquids.", SF),
    "paper_coffee_cup": rule("Paper coffee cup", "recycle", "Recology San Francisco accepts empty, clean paper coffee cups in the blue recycling cart; soiled paper has different rules.", SF),
    "beverage_carton": rule("Milk, juice or other beverage carton", "recycle", "Recology San Francisco accepts empty milk, juice and soup cartons in the blue recycling cart.", SF),
    "plastic_cutlery": rule("Plastic fork, spoon or knife", "recycle", "Recology San Francisco lists plastic utensils in its blue recycling cart guidance. Remove food residue and confirm the item is plastic, not compostable bioplastic.", SF),
    "paper_plate": rule("Disposable paper plate", "unverified", "Recology San Francisco accepts soiled paper plates in its green compost cart, but not all plates have the same coating. Confirm that the plate is ordinary fiber-based paper, not plastic or foil lined.", SF),
    "tissue_paper": rule("Used tissue", "unverified", "Recology San Francisco lists soiled tissues under the green compost cart, but mixed-material or chemically contaminated items may differ. Verify the exact item.", SF),
    "plastic_bags_film": rule("Clean plastic bags or film", "trash", "Recology San Francisco lists plastic bags and plastic film as landfill items, not blue-cart recycling.", SF),
    "styrofoam_packaging": rule("Styrofoam packaging", "unverified", "Recology San Francisco excludes Styrofoam from blue carts. Large clean blocks may qualify for a separate transfer-station service; verify restrictions before traveling.", SF),
    "alkaline_household_battery": rule("Household AA/AAA/C/D battery", "special", "Recology San Francisco excludes batteries from recycling and landfill carts. Use its designated battery-collection instructions; confirm the proper service for your battery type.", SF),
    "lithium_ion_battery": rule("Lithium-ion or rechargeable battery", "special", "Keep lithium-ion batteries out of all ordinary collection carts. Confirm safe battery collection with Recology or the city before transporting.", SF),
    "electronics": rule("Computer, phone or other electronics", "special", "Recology San Francisco excludes electronic devices from recycling and landfill carts. Verify an electronics collection service.", SF),
    "household_chemicals": rule("Paint, cleaner or household chemical", "special", "Recology San Francisco excludes hazardous chemicals from standard collection carts. Verify household hazardous-waste collection.", SF),
}

LA_RULES = {
    "plastic_bottle_jug": rule("Plastic bottle or jug", "recycle", "LA Sanitation's single-family blue-cart program accepts empty plastic bottles and jugs marked #1, #2 or #5. Confirm the resin code.", LA),
    "aluminum_steel_can": rule("Aluminum or steel food/drink can", "recycle", "LA Sanitation accepts empty, clean aluminum and steel cans in the blue cart.", LA),
    "glass_bottle_jar": rule("Glass bottle or jar", "recycle", "LA Sanitation accepts clean, empty glass bottles and jars in the blue recycling cart.", LA),
    "cardboard_box": rule("Cardboard box", "recycle", "LA Sanitation accepts clean cardboard in the blue cart. Flatten boxes and remove food residue.", LA),
    "paperboard_box": rule("Cereal or dry-food paperboard box", "recycle", "LA Sanitation accepts clean paperboard and cardboard in the blue cart.", LA),
    "paper_mail": rule("Mail, paper or newspaper", "recycle", "LA Sanitation accepts clean paper and mail in the blue recycling cart.", LA),
    "plastic_clamshell": rule("Plastic clamshell food container", "unverified", "LA Sanitation accepts rigid plastic containers marked #1, #2 or #5, but a clamshell's resin is not known from its shape. Confirm the number and local service rules before choosing a bin.", LA),
    "beverage_carton": rule("Milk, juice or other beverage carton", "recycle", "LA Sanitation's single-family guidance includes empty cartons with paper recyclables. Confirm the carton is clean and eligible.", LA),
    "plastic_bags_film": rule("Clean plastic bags or film", "trash", "LA Sanitation's black-bin rules put plastic bags and film plastic in household trash, not the blue bin.", LA_TRASH),
    "styrofoam_packaging": rule("Styrofoam packaging", "trash", "LA Sanitation's single-family black-bin guidance lists Styrofoam as non-recyclable household trash.", LA_TRASH),
    "alkaline_household_battery": rule("Household AA/AAA/C/D battery", "special", "LA Sanitation directs batteries to household hazardous-waste collection rather than blue or black carts. Check its S.A.F.E. Center rules.", LA_HAZARD),
    "lithium_ion_battery": rule("Lithium-ion or rechargeable battery", "special", "Keep rechargeable and lithium batteries out of ordinary carts. Check LA Sanitation's S.A.F.E. Center handling restrictions.", LA_HAZARD),
    "electronics": rule("Computer, phone or other electronics", "special", "LA Sanitation directs e-waste to special collection rather than blue or black carts. Check the S.A.F.E. Center program.", LA_HAZARD),
    "household_chemicals": rule("Paint, cleaner or household chemical", "special", "LA Sanitation directs hazardous household chemicals to a designated S.A.F.E. Center rather than ordinary bins.", LA_HAZARD),
}

RULES_BY_PROGRAM = {
    "frisco_tx": FRISCO_RULES,
    "mckinney_tx": MCKINNEY_RULES,
    "san_francisco_ca": SF_RULES,
    "los_angeles_ca": LA_RULES,
}
CATEGORIES = [{"id": key, "label": val.label} for key, val in FRISCO_RULES.items()]
CATEGORY_LABELS = {entry["id"]: entry["label"] for entry in CATEGORIES}
STATUS_LABELS = {
    "recycle": "Accepted in this recycling program",
    "trash": "Not accepted in the recycling cart",
    "dropoff": "Separate drop-off program",
    "special": "Special collection required",
    "unverified": "Not confirmed for this item",
}

Context = Literal["residential", "school", "commercial"]


def _postal_name(zip_code: str) -> str:
    if not re.fullmatch(r"\d{5}", zip_code):
        raise HTTPException(422, "Enter a five-digit US ZIP code.")
    try:
        _, _, postal_name = resolve_zip(zip_code)
    except HTTPException as exc:
        if exc.status_code == 404:
            raise HTTPException(404, "ZIP code not found in the offline postal lookup; try another ZIP.") from exc
        raise
    return postal_name


def _match(program_id: str, postal_name: str) -> bool:
    p = PROGRAMS[program_id]
    return postal_name.casefold() == f"{p['city']}, {p['state']}".casefold()


@router.get("/programs")
def list_programs(zip_code: str = Query(min_length=5, max_length=5)):
    postal_name = _postal_name(zip_code)
    return {
        "zip_code": zip_code,
        "postal_area": postal_name,
        "notice": "ZIP is only a postal-area hint. Confirm municipal boundaries, service provider, and collection type before using a local rule.",
        "scope": "Supported residential programs only; no school/commercial acceptance inferred.",
        "programs": [
            {"id": pid, **details, "postal_area_match": _match(pid, postal_name)}
            for pid, details in PROGRAMS.items()
        ],
        "categories": CATEGORIES,
    }


@router.get("/check")
def check_program(
    zip_code: str = Query(min_length=5, max_length=5),
    program_id: str = Query(min_length=1, max_length=64),
    category: str = Query(min_length=1, max_length=64),
    context: Context = "residential",
    service_confirmed: bool = False,
):
    postal_name = _postal_name(zip_code)
    if program_id not in PROGRAMS:
        raise HTTPException(422, "Choose one of the listed collection programs.")
    if category not in CATEGORY_LABELS:
        raise HTTPException(422, "Choose a listed item category.")
    program = PROGRAMS[program_id]
    matched = _match(program_id, postal_name)
    collection_rules = RULES_BY_PROGRAM[program_id]
    item_rule = collection_rules.get(category)
    service_matches = context == "residential" and service_confirmed and matched
    has_documented_item = service_matches and item_rule is not None

    if not service_matches:
        if context != "residential":
            direction = (
                "Only residential rules are documented here; school and business bins may use other contractors."
            )
        elif not service_confirmed:
            direction = (
                "You must confirm that the selected city program actually collects waste at this address."
            )
        else:
            direction = (
                "This ZIP's postal city differs from the selected program. ZIPs can cross municipal boundaries, "
                "but this service cannot verify your address. Contact the relevant waste authority."
            )
    else:
        direction = (
            "The selected official program does not explicitly specify this item. "
            "Confirm exact material and acceptance with its collection service."
        )

    if has_documented_item:
        status = item_rule.status
        direction = item_rule.direction
        source_url = item_rule.source_url
    else:
        status = "unverified"
        source_url = item_rule.source_url if item_rule is not None else program["source_url"]

    return {
        "program_id": program_id,
        "program": program["name"],
        "postal_area": postal_name,
        "category": category,
        "item_name": CATEGORY_LABELS[category],
        "status": status,
        "status_label": STATUS_LABELS[status],
        "direction": direction,
        "source_url": source_url,
        "scope": "Residential service only. School and business policies are separate.",
        "program_match": matched,
        "service_confirmed": service_confirmed,
        "documented_program_rule": has_documented_item and status != "unverified",
        "local_acceptance_verified": False,  # User-confirmed service, not independently verified address.
    }
