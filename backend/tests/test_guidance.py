from app.guidance import RULES, CATEGORIES, guidance_for
from app.inference import LABELS, ModelRunner, DEFAULT_MODEL_ID

def test_every_model_class_has_guidance():
    assert set(LABELS) == set(RULES) == set(CATEGORIES)

def test_batteries_never_get_household_recycling():
    battery = guidance_for("battery")
    assert battery["route"] == "special"
    assert "household-batteries" in battery["source_url"]
    assert "ordinary" in battery["headline"].lower()

def test_general_compost_and_trash_do_not_require_location():
    assert guidance_for("organic_waste")["finder"] is None
    assert guidance_for("trash")["finder"] is None

def test_default_is_evaluated_checkpoint_and_files_optional(tmp_path):
    runner = ModelRunner(tmp_path)
    options = runner.options()
    assert DEFAULT_MODEL_ID == options[0].id
    assert len(options) == 4
    assert all(not opt.available for opt in options)
