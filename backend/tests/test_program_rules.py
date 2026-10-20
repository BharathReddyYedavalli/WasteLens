"""Nationwide UI catalog has narrow verified program coverage, no inferred acceptance."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.program_rules import CATEGORIES, PROGRAMS, RULES_BY_PROGRAM

client = TestClient(app)


@pytest.mark.parametrize("zip_code,expected", [
    ("75033", "frisco_tx"),
    ("75070", "mckinney_tx"),
    ("94103", "san_francisco_ca"),
    ("90012", "los_angeles_ca"),
])
def test_local_programs_are_suggested_from_postal_city_not_automatically_confirmed(zip_code, expected):
    r = client.get("/api/local-rules/programs", params={"zip_code": zip_code})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["postal_area"]
    assert expected in [p["id"] for p in data["programs"] if p["postal_area_match"]]
    assert len(data["programs"]) == 4
    assert "ZIP" in data["notice"]
    assert {x["id"] for x in data["categories"]} == {x["id"] for x in CATEGORIES}


def test_uncovered_zip_still_works_without_fake_municipal_rules():
    r = client.get("/api/local-rules/programs", params={"zip_code": "10001"})
    assert r.status_code == 200
    assert not any(p["postal_area_match"] for p in r.json()["programs"])


@pytest.mark.parametrize("city,postal_zip,program", [
    ("Frisco","75033","frisco_tx"),
    ("McKinney","75070","mckinney_tx"),
    ("San Francisco","94103","san_francisco_ca"),
    ("Los Angeles","90012","los_angeles_ca"),
])
def test_all_programs_have_source_backed_recyclable_items(city, postal_zip, program):
    r = client.get("/api/local-rules/check", params={
        "zip_code": postal_zip, "program_id": program,
        "category": "glass_bottle_jar", "service_confirmed": "true",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "recycle"
    assert city.lower() in data["program"].lower() or program == "san_francisco_ca"
    assert data["source_url"].startswith("https://")
    assert data["local_acceptance_verified"] is True
    assert "Residential" in data["scope"]


def test_same_clamshell_has_different_results_between_frisco_and_san_francisco():
    frisco = client.get("/api/local-rules/check", params={
        "zip_code": "75033", "program_id": "frisco_tx",
        "category": "plastic_clamshell", "service_confirmed": "true",
    }).json()
    sf = client.get("/api/local-rules/check", params={
        "zip_code": "94103", "program_id": "san_francisco_ca",
        "category": "plastic_clamshell", "service_confirmed": "true",
    }).json()
    assert frisco["status"] == "trash"
    assert sf["status"] == "recycle"
    assert frisco["source_url"] != sf["source_url"]


def test_paper_coffee_cup_varies_by_city():
    frisco = client.get("/api/local-rules/check", params={
        "zip_code": "75033", "program_id": "frisco_tx",
        "category": "paper_coffee_cup", "service_confirmed": "true",
    }).json()
    sf = client.get("/api/local-rules/check", params={
        "zip_code": "94103", "program_id": "san_francisco_ca",
        "category": "paper_coffee_cup", "service_confirmed": "true",
    }).json()
    assert frisco["status"] == "trash"
    assert sf["status"] == "recycle"


def test_missing_specific_material_rule_fails_closed_not_copying_frisco():
    mckinney = client.get("/api/local-rules/check", params={
        "zip_code": "75070", "program_id": "mckinney_tx",
        "category": "plastic_clamshell", "service_confirmed": "true",
    }).json()
    assert mckinney["status"] == "unverified"
    assert mckinney["local_acceptance_verified"] is False
    assert mckinney["source_url"] == PROGRAMS["mckinney_tx"]["source_url"]


def test_unverified_la_clamshell_requires_material_confirmation():
    la = client.get("/api/local-rules/check", params={
        "zip_code": "90012", "program_id": "los_angeles_ca",
        "category": "plastic_clamshell", "service_confirmed": "true",
    }).json()
    assert la["status"] == "unverified"
    assert "#1" in la["direction"]


def test_unsupported_school_and_business_never_inherit_household_rules():
    for context in ("school", "commercial"):
        r = client.get("/api/local-rules/check", params={
            "zip_code": "94103", "program_id": "san_francisco_ca",
            "category": "plastic_bottle_jug", "context": context,
            "service_confirmed": "true",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "unverified"
        assert not data["local_acceptance_verified"]
        assert "contractor" in data["direction"]


def test_service_confirmation_required_even_when_zip_matches():
    r = client.get("/api/local-rules/check", params={
        "zip_code": "94103", "program_id": "san_francisco_ca",
        "category": "plastic_clamshell",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "unverified"
    assert not r.json()["local_acceptance_verified"]


def test_mismatched_program_and_postal_city_not_certified():
    r = client.get("/api/local-rules/check", params={
        "zip_code": "75070", "program_id": "frisco_tx",
        "category": "plastic_bottle_jug", "service_confirmed": "true",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "unverified"
    assert r.json()["program_match"] is False
    assert not r.json()["local_acceptance_verified"]


@pytest.mark.parametrize("params", [
    {"zip_code": "75abc", "program_id": "frisco_tx", "category": "glass_bottle_jar"},
    {"zip_code": "75033", "program_id": "wrong", "category": "glass_bottle_jar"},
    {"zip_code": "75033", "program_id": "frisco_tx", "category": "not_an_item"},
    {"zip_code": "75033", "program_id": "frisco_tx", "category": "glass_bottle_jar", "context": "unknown"},
])
def test_invalid_inputs_rejected(params):
    assert client.get("/api/local-rules/check", params=params).status_code == 422


def test_unknown_postal_code_reports_missing_reference_data():
    assert client.get("/api/local-rules/programs", params={"zip_code": "00000"}).status_code == 404


def test_programs_never_invent_official_sources_or_acceptance_for_unlisted_categories():
    assert set(PROGRAMS) == set(RULES_BY_PROGRAM)
    ids = {item["id"] for item in CATEGORIES}
    for program, entries in RULES_BY_PROGRAM.items():
        assert entries.keys() <= ids
        for entry in entries.values():
            assert entry.source_url.startswith("https://")
            assert entry.status in ("recycle", "trash", "dropoff", "special", "unverified")
            assert len(entry.direction) > 35
