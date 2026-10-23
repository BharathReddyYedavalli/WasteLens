"""Admin-provided sorting guidance for one shared kiosk installation.

These rules are NOT independently verified. A staff member has to confirm the
accepted-material list for their actual school or office waste provider.
A scanner result never determines the site rule by itself.
"""
from __future__ import annotations

import json
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, model_validator

from .accounts import database, now_iso, require_admin, require_same_origin_action

router = APIRouter(prefix="/api/kiosk", tags=["Site kiosk"])
Item = Literal[
    "empty_plastic_bottle", "empty_metal_can", "empty_glass_bottle",
    "clean_paper", "clean_cardboard", "plastic_cutlery", "paper_plate",
    "empty_food_container", "disposable_cup", "food_scraps", "plastic_film",
]
ITEMS: tuple[str, ...] = (
    "empty_plastic_bottle", "empty_metal_can", "empty_glass_bottle",
    "clean_paper", "clean_cardboard", "plastic_cutlery", "paper_plate",
    "empty_food_container", "disposable_cup", "food_scraps", "plastic_film",
)


class Bin(BaseModel):
    id: str = Field(pattern=r"^bin_[1-9][0-9]?$", max_length=6)
    name: str = Field(min_length=1, max_length=40)


class ItemRule(BaseModel):
    item_type: Item
    bin_id: str = Field(pattern=r"^bin_[1-9][0-9]?$", max_length=6)


class ConfigureSite(BaseModel):
    organization: str = Field(min_length=2, max_length=80)
    source: str = Field(min_length=10, max_length=300)
    bins: list[Bin] = Field(min_length=2, max_length=4)
    rules: list[ItemRule] = Field(min_length=1, max_length=len(ITEMS))
    rules_checked: bool

    @model_validator(mode="after")
    def validate_site(self):
        if not self.rules_checked:
            raise ValueError("Confirm that you checked this site's actual collection rules.")
        if not self.organization.strip() or not self.source.strip():
            raise ValueError("Organization and rule source are required.")
        ids = [item.id for item in self.bins]
        names = [item.name.strip().casefold() for item in self.bins]
        if len(ids) != len(set(ids)) or not all(names) or len(names) != len(set(names)):
            raise ValueError("Bins need different IDs and nonempty, distinct names.")
        items = [item.item_type for item in self.rules]
        if len(items) != len(set(items)):
            raise ValueError("Each item type may be assigned to only one bin.")
        if any(item.bin_id not in ids for item in self.rules):
            raise ValueError("Every item rule must refer to one of the configured bins.")
        return self


@router.get("/profile")
def read_kiosk_profile():
    # The public kiosk needs only these labels and rule mappings, not account data.
    with database() as db:
        row = db.execute(
            "SELECT organization,source,bins_json,rules_json,reviewed_at "
            "FROM kiosk_profile WHERE id=1"
        ).fetchone()
    if row is None:
        return {
            "configured": False, "organization": "", "source": "",
            "bins": [], "rules": [], "reviewed_at": None,
        }
    return {
        "configured": True,
        "organization": row["organization"],
        "source": row["source"],
        "bins": json.loads(row["bins_json"]),
        "rules": json.loads(row["rules_json"]),
        "reviewed_at": row["reviewed_at"],
    }


@router.put("/profile")
def configure_kiosk_profile(payload: ConfigureSite, request: Request):
    require_same_origin_action(request)
    require_admin(request)
    now = now_iso()
    with database() as db:
        db.execute(
            """INSERT INTO kiosk_profile(id,organization,source,bins_json,rules_json,reviewed_at)
               VALUES(1,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET
                  organization=excluded.organization,source=excluded.source,
                  bins_json=excluded.bins_json,rules_json=excluded.rules_json,
                  reviewed_at=excluded.reviewed_at""",
            (
                payload.organization.strip(), payload.source.strip(),
                json.dumps([{"id":b.id,"name":b.name.strip()} for b in payload.bins]),
                json.dumps([r.model_dump() for r in payload.rules]), now,
            ),
        )
    return read_kiosk_profile()
