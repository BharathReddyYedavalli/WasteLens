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
    assert data["program"] == PROGRAMS[program]["name"]
    assert data["source_url"].startswith("https://")
    assert data["documented_program_rule"] is True
    assert data["local_acceptance_verified"] is False
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
    assert mckinney["documented_program_rule"] is False
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
        assert not data["documented_program_rule"]
        assert "contractor" in data["direction"]


def test_service_confirmation_required_even_when_zip_matches():
    r = client.get("/api/local-rules/check", params={
        "zip_code": "94103", "program_id": "san_francisco_ca",
        "category": "plastic_clamshell",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "unverified"
    assert not r.json()["documented_program_rule"]


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


# Stage 3: every supported postal lookup can get references without guessed acceptance.
@pytest.mark.parametrize("zip_code,state", [
    ("10001", "NY"), ("75033", "TX"), ("94103", "CA"), ("90012", "CA"),
])
def test_nationwide_fallback_finds_official_references_but_never_bin_acceptance(zip_code, state):
    response = client.get("/api/local-rules/discovery", params={
        "zip_code": zip_code, "category": "glass_bottle_jar",
    })
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["postal_area"]
    assert data["state"] == state
    assert data["status"] == "unverified"
    assert data["local_acceptance_verified"] is False
    assert data["documented_program_rule"] is False
    assert data["official_links"]
    assert all(link["kind"] == "official_reference" for link in data["official_links"])
    assert all(link["url"].startswith("https://") for link in data["official_links"])
    assert data["local_search"]["kind"] == "unverified_web_search"
    assert "google.com/search?" in data["local_search"]["url"]
    assert "ZIP" in data["disclaimer"]


def test_discovery_for_uncovered_zip_does_not_copy_a_nearby_city_rule():
    result = client.get("/api/local-rules/discovery", params={
        "zip_code": "10001", "category": "plastic_clamshell",
    }).json()
    assert result["status"] == "unverified"
    assert result["local_acceptance_verified"] is False
    assert "accepted" not in result["next_step"].lower() or "whether" in result["next_step"].lower()
    assert any("epa.gov" in link["url"] for link in result["official_links"])


def test_school_and_business_discovery_warns_about_contract_specific_rules():
    for context in ("school", "commercial"):
        result = client.get("/api/local-rules/discovery", params={
            "zip_code": "10001", "category": "beverage_carton", "context": context,
        }).json()
        assert result["status"] == "unverified"
        assert result["context"] == context
        assert "contracted waste hauler" in result["next_step"]


def test_lithium_discovery_prioritizes_fire_safe_handling():
    result = client.get("/api/local-rules/discovery", params={
        "zip_code": "10001", "category": "lithium_ion_battery",
    }).json()
    assert result["status"] == "unverified"
    assert "Do not put lithium-ion batteries in household trash" in result["next_step"]
    assert any("used-lithium-ion-batteries" in link["url"] for link in result["official_links"])


@pytest.mark.parametrize("params,status", [
    ({"zip_code": "10001", "category": "not_real"}, 422),
    ({"zip_code": "12abc", "category": "glass_bottle_jar"}, 422),
    ({"zip_code": "00000", "category": "glass_bottle_jar"}, 404),
    ({"zip_code": "10001", "category": "glass_bottle_jar", "context": "warehouse"}, 422),
])
def test_discovery_validates_inputs_and_unknown_postal_records(params, status):
    assert client.get("/api/local-rules/discovery", params=params).status_code == status


def test_discovery_never_replaces_existing_fully_confirmed_program_answer():
    confirmed = client.get("/api/local-rules/check", params={
        "zip_code": "75033", "program_id": "frisco_tx",
        "category": "glass_bottle_jar", "service_confirmed": "true",
    }).json()
    generic = client.get("/api/local-rules/discovery", params={
        "zip_code": "75033", "category": "glass_bottle_jar",
    }).json()
    assert confirmed["status"] == "recycle"
    assert generic["status"] == "unverified"
    assert generic["local_acceptance_verified"] is False
