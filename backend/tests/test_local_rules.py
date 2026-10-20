"""Independent policy-check tests: no Gemini call or image inference."""
from fastapi.testclient import TestClient

from app.main import app
from app.local_rules import RULES, CURBSIDE, COLLECTION, CHEMICALS

client = TestClient(app)


def test_catalog_is_explicitly_residential_and_public():
    resp = client.get("/api/local-rules/frisco/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert "NOT school" in data["scope"]
    assert {x["id"] for x in data["categories"]} == set(RULES)


def test_positive_residential_categories_are_city_sourced():
    for item in ["plastic_bottle_jug", "aluminum_steel_can", "glass_bottle_jar", "cardboard_box"]:
        resp = client.get("/api/local-rules/frisco/check", params={"category": item})
        assert resp.status_code == 200
        result = resp.json()
        assert result["status"] == "recycle"
        assert result["source_url"] in (CURBSIDE, COLLECTION)
        assert result["scope"] == "Frisco residential collection only"


def test_clamshell_and_coffee_cup_are_explicitly_not_curbside_accepted():
    for item in ("plastic_clamshell", "paper_coffee_cup", "beverage_carton"):
        result = client.get("/api/local-rules/frisco/check", params={"category": item}).json()
        assert result["status"] == "trash"
        assert result["source_url"] == CURBSIDE


def test_dedicated_dropoff_is_not_marked_as_curbside():
    for item in ("plastic_bags_film", "styrofoam_packaging", "alkaline_household_battery"):
        result = client.get("/api/local-rules/frisco/check", params={"category": item}).json()
        assert result["status"] == "dropoff"
        assert result["source_url"] == COLLECTION


def test_hazardous_items_are_special_collection():
    for item in ("lithium_ion_battery", "electronics", "household_chemicals"):
        result = client.get("/api/local-rules/frisco/check", params={"category": item}).json()
        assert result["status"] == "special"
        assert result["source_url"] == CHEMICALS


def test_no_false_accepted_claim_for_unlisted_school_items():
    for item in ("paper_plate", "plastic_cutlery", "other"):
        result = client.get("/api/local-rules/frisco/check", params={"category": item}).json()
        assert result["status"] == "unverified"


def test_city_residential_policy_never_becomes_school_or_commercial_policy():
    for context in ("school", "commercial"):
        result = client.get("/api/local-rules/frisco/check", params={
            "category": "plastic_bottle_jug", "context": context,
        }).json()
        assert result["status"] == "unverified"
        assert "contractor" in result["direction"]
        assert result["scope"] != "Frisco residential collection only"


def test_unknown_category_rejected_without_guessing():
    assert client.get("/api/local-rules/frisco/check",
                      params={"category": "plastic_anything"}).status_code == 422


def test_bad_context_rejected():
    assert client.get("/api/local-rules/frisco/check",
                      params={"category": "plastic_bottle_jug", "context": "magical"}).status_code == 422


def test_policy_has_nonempty_sources_and_explanations():
    for rule in RULES.values():
        assert rule.source_url.startswith("https://www.friscotexas.gov/")
        assert len(rule.direction) > 40
        assert rule.status in ("recycle", "trash", "dropoff", "special", "unverified")
