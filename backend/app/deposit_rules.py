"""Source-linked beverage deposit rules, reviewed October 18, 2026.

Estimates are conditional on a deposit being paid in the selected state.
This deliberately does NOT infer a claimable refund from a photograph or an
out-of-state package. Values are integer cents; no floating point currency.
Not every product, label exception or temporary transition can be inferred
from the inputs. Those cases return 'check' rather than an invented payout.
"""
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api")
STATE_SOURCES = {
    "CA": ("California", "https://calrecycle.ca.gov/bevcontainer/"),
    "CT": ("Connecticut", "https://portal.ct.gov/DEEP/Reduce-Reuse-Recycle/Bottles/Connecticut-Bottle-Bill"),
    "HI": ("Hawaii", "https://health.hawaii.gov/hi5/consumers/"),
    "IA": ("Iowa", "https://www.iowadnr.gov/environmental-protection/land-quality/recycling/bottle-deposit-law"),
    "ME": ("Maine", "https://www1.maine.gov/dep/sustainability/bottlebill/index.html"),
    "MA": ("Massachusetts", "https://www.mass.gov/deposit-bottle-can-recycling"),
    "MI": ("Michigan", "https://www.michigan.gov/egle/faqs/recycling/bottle-deposit-law"),
    "NY": ("New York", "https://dec.ny.gov/environmental-protection/recycling-composting/bottle-bill"),
    "OR": ("Oregon", "https://www.oregon.gov/olcc/pages/bottle-bill-redeemable.aspx"),
    "VT": ("Vermont", "https://dec.vermont.gov/waste-management/solid/product-stewardship/vermonts-bottle-bill"),
}
DRINK = Literal["soda", "water", "sparkling_water", "beer", "cider", "juice",
                "sports_energy", "coffee_tea", "wine", "liquor", "mixed_alcohol",
                "milk", "other"]
MATERIAL = Literal["aluminum", "glass", "plastic", "carton", "pouch", "other"]
RESIN = Literal["pet1", "hdpe2", "other", "unknown"]
PAID = Literal["yes", "no", "unsure"]

class DepositRequest(BaseModel):
    state: Literal["CA","CT","HI","IA","ME","MA","MI","NY","OR","VT"]
    drink: DRINK
    material: MATERIAL
    ounces: float = Field(gt=0, le=512)
    count: int = Field(ge=1, le=5000)
    paid_in_state: PAID = "unsure"
    resin: RESIN = "unknown"


def _classify(info: DepositRequest):
    """Return (status, cents, reason), where check is not a guaranteed refund."""
    st, drink, material, oz = info.state, info.drink, info.material, info.ounces
    no = lambda why: ("no", 0, why)
    check = lambda cents, why: ("check", cents, why)
    yes = lambda cents, why: ("yes", cents, why)
    rigid = material in {"plastic", "aluminum", "glass"}
    if drink == "other":
        return check(0, "Check the exact beverage name and state refund marking.")
    if material == "other":
        return check(0, "Material is not confirmed. Check the container and refund label.")

    if st == "CA":
        if drink == "milk":
            return no("Milk and infant formula are not part of California CRV.")
        if material in {"pouch", "carton"}:
            if drink in {"wine", "liquor", "mixed_alcohol"}:
                return yes(25, "Wine or distilled spirits in eligible pouches and boxes carry 25¢ CRV.")
            return no("Ordinary juice and drink cartons and pouches are not CRV containers.")
        if rigid:
            return yes(5 if oz < 24 else 10, "California CRV depends on size: less than 24 oz is 5¢; 24 oz or more is 10¢.")
    if st == "CT":
        if not rigid:
            return no("Paper cartons and pouches are excluded.")
        if drink in {"wine", "liquor", "mixed_alcohol", "cider", "milk"}:
            return no("This type of drink is not currently included in Connecticut's 10¢ program.")
        if oz < 150/29.5735296:
            return no("Containers smaller than 150 mL are excluded in Connecticut.")
        maximum = 3*1000/29.5735296 if drink in {"soda", "sparkling_water", "beer"} else 2.5*1000/29.5735296
        if oz > maximum:
            return no("Above Connecticut's maximum covered container size for this beverage.")
        return yes(10, "Connecticut covers many noncarbonated drinks as well as soda and beer.")
    if st == "HI":
        if not rigid or oz > 68:
            return no("HI 5 containers are aluminum, glass or qualifying plastic at 68 fl oz or less.")
        if drink in {"milk","wine","liquor","mixed_alcohol"}:
            return no("Milk, wine and distilled spirits are not in HI 5.")
        if material == "plastic" and info.resin == "other":
            return no("HI 5 plastic containers must be PET #1 or HDPE #2.")
        if material == "plastic" and info.resin == "unknown":
            return check(5, "Check for the HI 5¢ label and plastic resin #1 or #2. A separate 1¢ fee is not refundable.")
        return yes(5, "Hawaii pays 5¢ back. Its separate 1¢ container fee is not refundable.")
    if st == "IA":
        if not rigid:
            return check(5, "Iowa covers qualifying beverage containers; check the exact packaging.")
        if drink in {"water", "juice", "sports_energy", "coffee_tea", "milk"}:
            return no("Iowa's 5¢ program covers carbonated and alcoholic beverages, not ordinary still drinks.")
        return yes(5, "Iowa's deposit on covered carbonated and alcoholic beverages is 5¢.")
    if st == "ME":
        if drink == "milk":
            return no("Milk and dairy products are excluded.")
        if not rigid:
            return check(5, "Check whether this specific package has a Maine deposit.")
        if drink in {"wine", "liquor"}:
            return yes(15, "Maine uses a 15¢ deposit on wine and spirits.")
        if drink in {"juice","cider"}:
            return check(5, "Maine excludes some local fresh cider and blueberry juice products. Check the label.")
        return yes(5, "Most other covered Maine beverage containers have a 5¢ deposit.")
    if st == "MA":
        if not rigid:
            return no("This is outside the usual Massachusetts carbonated bottle and can program.")
        if drink in {"soda", "sparkling_water", "beer"}:
            return yes(5, "Massachusetts covers carbonated soft drinks, beer and sparkling water.")
        if drink in {"sports_energy", "cider", "coffee_tea", "juice"}:
            return check(5, "Massachusetts coverage depends on carbonation and beverage type. Check the state's bottle refund label.")
        return no("Massachusetts generally excludes still water, milk, wine and spirits.")
    if st == "MI":
        if oz > 128:
            return no("Michigan's container definition covers one gallon or less.")
        if not rigid:
            return check(10, "Michigan's 10¢ program has specific beverage and container requirements.")
        if drink in {"soda", "sparkling_water", "beer", "mixed_alcohol"}:
            return yes(10, "Michigan's 10¢ program covers carbonated drinks, malt drinks and certain mixed alcoholic drinks.")
        return no("Michigan excludes plain water, juice, milk, hard cider and ordinary wine and spirits.")
    if st == "NY":
        if oz >= 128:
            return no("New York bottle bill containers must hold less than one gallon.")
        if not rigid:
            return no("New York excludes drink boxes and pouches.")
        if drink in {"soda", "sparkling_water", "beer", "water"}:
            return yes(5, "New York covers soda, beer and unsweetened water in eligible containers.")
        if drink == "mixed_alcohol":
            return check(5, "Wine products and malt beverages may qualify, but spirit based cocktails generally do not.")
        return no("New York excludes still juice, tea, sports drinks, wine, liquor and hard cider.")
    if st == "OR":
        if not rigid:
            return no("Oregon excludes cartons, foil pouches and drink boxes.")
        if drink in {"milk", "liquor", "mixed_alcohol"}:
            return no("Oregon generally excludes milk and distilled spirits, including spirit cocktails.")
        if drink == "wine":
            if material != "aluminum":
                return no("Oregon covers qualifying canned wine, not wine in glass or plastic.")
            if 4 <= oz <= 1.5*1000/29.5735296:
                return yes(10, "Wine in metal cans became eligible in 2025.")
            return no("Oregon's canned wine size range is 4 oz through 1.5 L.")
        if drink in {"soda", "water", "sparkling_water", "beer", "cider"}:
            if oz > 3*1000/29.5735296:
                return no("Oregon's soda, water and beer group is limited to 3 L.")
            if drink == "cider":
                return check(10, "Hard cider depends on alcohol content; wine style ciders may not qualify.")
            return yes(10, "Oregon's refund value is 10¢ for eligible drinks.")
        if not 4 <= oz <= 1.5*1000/29.5735296:
            return no("This beverage in Oregon must be 4 oz through 1.5 L.")
        return yes(10, "Oregon covers many juices, teas and sports drinks in this size range.")
    if st == "VT":
        if oz > 3*1000/29.5735296:
            return no("Vermont excludes containers above 3 liters.")
        if material in {"carton", "pouch"}:
            return check(15 if drink == "liquor" else 5, "2026 Vermont changes removed some pouches and cartons from new deposits, with a transition for old labeled containers through July 2027.")
        if material == "plastic":
            if info.resin == "other":
                return no("Vermont now limits plastic bottle eligibility to PET #1 or HDPE #2.")
            if info.resin == "unknown":
                return check(15 if drink == "liquor" else 5, "Check plastic recycling resin #1 or #2 and the Vermont redemption marking.")
        if drink == "liquor":
            return yes(15, "Vermont refunds 15¢ on eligible liquor bottles.")
        if drink in {"soda", "sparkling_water", "beer"}:
            return yes(5, "Vermont's eligible carbonated beverages and malt drinks carry 5¢.")
        if drink == "mixed_alcohol":
            return check(5, "Confirm whether this is a covered malt based cocktail or excluded wine or spirit based drink.")
        return no("Vermont excludes ordinary still water, juice, wine and hard cider.")
    return check(0, "Confirm the product under the official state rules.")


def calculate(info: DepositRequest) -> dict:
    status, cents, reason = _classify(info)
    if info.paid_in_state == "no":
        status, cents, reason = "no", 0, "A deposit paid in another state is not refundable here."
    elif info.paid_in_state == "unsure" and status == "yes":
        status = "check"
        reason += " Confirm the deposit was paid in this state."
    amount = info.count * cents
    state_name, url = STATE_SOURCES[info.state]
    return {
        "state": state_name, "state_code": info.state,
        "status": status, "per_container_cents": cents,
        "total_cents": amount, "count": info.count,
        "reason": reason, "source_url": url,
        "amount_is_confirmed": False,  # Eligibility is modeled, never proof of payout.
        "label": "Refund estimate" if status == "yes" else "Possible value, not confirmed" if status == "check" else "No deposit estimated",
        "note": "A return location must accept the eligible container. These are eligibility estimates, not payment guarantees.",
    }


@router.get("/deposit/states")
def states():
    return [{"code": code, "name": name, "source_url": url}
            for code, (name, url) in STATE_SOURCES.items()]


@router.post("/deposit/calculate")
def deposit_calculator(info: DepositRequest):
    return calculate(info)
