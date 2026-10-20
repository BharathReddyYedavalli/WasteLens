"""No-network tests of fail-closed sorting when Gemini is unsure or names hazards."""
from io import BytesIO
from types import SimpleNamespace

import pytest
from PIL import Image

from app.vision import AIUnavailable, InvalidPhoto, ItemAnalysis, ReuseProject, analyze_photo
from app.vision_safety import explicit_high_risk_name, review_sorting_safety


def sample(**changes):
    data = dict(
        item_name="Plastic drink bottle",
        visual_description="A beverage container",
        material_guess="PET plastic",
        identification="likely",
        route="check_recycling",
        route_title="Recycle it",
        disposal_steps=["Put it into any curbside recycling bin."],
        reuse_ideas=["Use as a planter."],
        reuse_projects=[ReuseProject(
            title="Seed planter", outcome="A planter for seedlings",
            materials_needed=["scissors"], steps=["Cut the bottle."],
            minutes_estimate=12,
        )],
        cautions=["Check local rules."],
        follow_up_question="",
        location_helpful=True,
        collection_search_term="plastic bottles",
    )
    data.update(changes)
    return ItemAnalysis(**data)


@pytest.mark.parametrize("language", ["en", "es", "hi"])
def test_uncertain_photo_discards_directions_and_all_reuse_ideas(language):
    original = sample(
        identification="multiple_items", item_name="Unidentified item",
        material_guess="unknown",
    )
    result = review_sorting_safety(original, language)
    assert result.route == "needs_identification"
    assert result.reuse_ideas == []
    assert result.reuse_projects == []
    assert result.location_helpful is False
    assert result.collection_search_term == ""
    assert result.disposal_steps
    assert not any("Put it into any" in step for step in result.disposal_steps)
    assert result.follow_up_question
    assert result.cautions
    # Guardrails do not mutate the original model object.
    assert len(original.reuse_projects) == 1


@pytest.mark.parametrize("label", [
    "Lithium-ion battery", "AA batteries", "Swollen power bank",
    "Used syringe", "Aerosol can", "Drain cleaner", "Propane cylinder",
])
def test_explicit_hazards_override_unsafe_model_advice(label):
    result = review_sorting_safety(sample(item_name=label))
    assert result.route == "special_dropoff"
    assert result.reuse_projects == []
    assert result.reuse_ideas == []
    assert result.collection_search_term == ""
    assert len(result.disposal_steps) == 3
    assert "puncture" in " ".join(result.disposal_steps)
    assert "Put it into any" not in " ".join(result.disposal_steps)


@pytest.mark.parametrize("label", [
    "Battery charger", "Battery-powered toy", "Battery case", "Working smartphone",
    "Rechargeable flashlight", "Reusable water bottle",
])
def test_everyday_reusables_not_mislabeled_hazardous(label):
    assert not explicit_high_risk_name(label)
    result = review_sorting_safety(sample(
        item_name=label, route="reuse_first",
        route_title="Keep using", material_guess="unknown",
    ))
    assert result.route == "reuse_first"
    assert result.reuse_projects


@pytest.mark.parametrize("material,route,language", [
    ("unknown", "check_recycling", "en"),
    ("Unknown, possibly paper", "check_compost", "en"),
    ("material desconocido", "check_recycling", "es"),
    ("सामग्री अज्ञात", "check_recycling", "hi"),
])
def test_ambiguous_material_blocks_bin_choice(material, route, language):
    result = review_sorting_safety(sample(
        material_guess=material, route=route
    ), language)
    assert result.identification == "likely"
    assert result.route == "needs_identification"
    assert result.follow_up_question
    assert result.reuse_projects == []
    assert result.location_helpful is False
    assert not any("Put it into any" in s for s in result.disposal_steps)


@pytest.mark.parametrize("label,language", [
    ("Batería de litio", "es"),
    ("Jeringa usada", "es"),
    ("बैटरी", "hi"),
    ("कीटनाशक", "hi"),
])
def test_localized_hazard_names_also_get_safe_guidance(label, language):
    result = review_sorting_safety(sample(item_name=label), language)
    assert result.route == "special_dropoff"
    assert result.reuse_ideas == []
    assert result.reuse_projects == []
    assert result.disposal_steps


@pytest.mark.parametrize("label", ["Cargador de batería", "बैटरी चार्जर"])
def test_localized_chargers_not_classified_as_loose_batteries(label):
    assert not explicit_high_risk_name(label)


def test_an_ai_clarification_route_always_blocks_generated_disposal_steps():
    result = review_sorting_safety(sample(
        identification="likely", route="needs_identification",
        material_guess="PET plastic",
    ))
    assert result.route == "needs_identification"
    assert result.reuse_projects == []
    assert result.reuse_ideas == []
    assert not any("Put it into any" in step for step in result.disposal_steps)


def test_normal_confirmed_material_keeps_useful_specific_instructions():
    original = sample()
    result = review_sorting_safety(original)
    assert result.disposal_steps == original.disposal_steps
    assert result.reuse_projects == original.reuse_projects
    assert result.location_helpful
    assert result.collection_search_term == original.collection_search_term


def test_unhelpful_location_keyword_discarded_when_location_not_needed():
    result = review_sorting_safety(sample(
        route="reuse_first", location_helpful=False
    ))
    assert result.collection_search_term == ""


def test_broken_upload_reported_before_missing_api_key(monkeypatch):
    monkeypatch.setattr("app.vision.configured", lambda: False)
    with pytest.raises(InvalidPhoto):
        analyze_photo(b"not a real photo", "gemini-3.8-flash")


def test_mocked_gemini_response_runs_through_safety_before_return(monkeypatch):
    import google.genai as genai

    model_answer = sample(
        item_name="Swollen lithium-ion battery",
        disposal_steps=["Cut the battery apart.", "Put it in any bin."],
    )

    def mock_generate_content(**kwargs):
        assert kwargs["model"] == "gemini-3.8-flash"
        return SimpleNamespace(text=model_answer.model_dump_json())

    fake_client = SimpleNamespace(
        models=SimpleNamespace(generate_content=mock_generate_content)
    )
    monkeypatch.setattr(genai, "Client", lambda **kwargs: fake_client)
    monkeypatch.setenv("GEMINI_API_KEY", "unit-test-only-not-a-real-key")
    image = Image.new("RGB", (60, 60), "gray")
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    analyzed = analyze_photo(buffer.getvalue(), "gemini-3.8-flash")
    assert analyzed.route == "special_dropoff"
    assert analyzed.reuse_projects == []
    assert all("Cut the battery apart" not in x for x in analyzed.disposal_steps)
    assert analyzed.collection_search_term == ""


def test_unsupported_language_not_accepted():
    with pytest.raises(ValueError):
        review_sorting_safety(sample(), "xx")
