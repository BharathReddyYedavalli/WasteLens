import pytest

from app.vision import ItemAnalysis, MODELS

def test_model_allowlist():
    assert "gemini-3.8-flash" in MODELS
    assert "gemini-3.5-flash-lite" in MODELS
    assert len(MODELS) == 2

def test_schema_requires_specific_fields():
    with pytest.raises(Exception):
        ItemAnalysis.model_validate({"item_name": "bottle"})

def test_uncertainty_is_explicit():
    example = ItemAnalysis(
        item_name="Unidentified object", visual_description="Partly occluded.",
        material_guess="unknown", identification="uncertain",
        route="needs_identification", route_title="Check object",
        disposal_steps=[], reuse_ideas=[], cautions=[],
        follow_up_question="What object is this?",
        location_helpful=False, collection_search_term=""
    )
    assert example.identification == "uncertain"



def test_reuse_project_schema_and_backwards_compatibility():
    from app.vision import ReuseProject
    project = ReuseProject(
        title="Desk cable holder",
        outcome="Organize cables using a clean, empty container.",
        materials_needed=["empty container", "tape"],
        steps=["Wash and dry the empty container.", "Place cables inside."],
        difficulty="Easy", minutes_estimate=10,
    )
    assert project.minutes_estimate == 10
    assert project.safety_note == ""
    with pytest.raises(Exception):
        ReuseProject(
            title="Bad project", outcome="Extremely risky and unsafe idea",
            minutes_estimate=0,
        )
    legacy = ItemAnalysis(
        item_name="Plastic container", visual_description="Empty transparent container",
        material_guess="Plastic (unverified)", identification="likely",
        route="reuse_first", route_title="Keep using",
        disposal_steps=[], reuse_ideas=["Use for organization."], cautions=[],
        follow_up_question="", location_helpful=False, collection_search_term=""
    )
    assert legacy.reuse_projects == []
    assert legacy.model_dump()["reuse_projects"] == []
