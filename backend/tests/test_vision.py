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
