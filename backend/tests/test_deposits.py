"""Bottle deposit eligibility should not depend on uncertain AI visual claims."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.deposits import EstimateRequest, estimate_deposit

def check(**kwargs):
    return estimate_deposit(EstimateRequest(**({"purchased_state":"CA","beverage":"water",
        "material":"plastic","size_oz":16.9,"label_visible":"yes"} | kwargs)))

def test_california_threshold():
    assert check()["per_container_cents"] == 5
    assert check(size_oz=24)["per_container_cents"] == 10
    assert check(size_oz=32,quantity=12)["estimated_total_cents"] == 120

def test_california_special_and_exclusions():
    assert check(beverage="wine",material="carton_pouch",size_oz=None)["per_container_cents"] == 25
    assert check(beverage="juice",material="carton_pouch")["status"] == "not_covered"
    assert check(beverage="milk")["status"] == "not_covered"
    assert check(label_visible="no")["per_container_cents"] is None
    assert check(label_visible="unknown")["status"] == "possible_refund"

def test_oregon_limit_and_special():
    assert check(purchased_state="OR",size_oz=16.9)["per_container_cents"] == 10
    assert check(purchased_state="OR",beverage="juice",size_oz=64)["status"] == "not_covered"
    assert check(purchased_state="OR",beverage="wine",material="glass")["status"] == "not_covered"
    assert check(purchased_state="OR",beverage="wine",material="metal")["per_container_cents"] == 10
    assert check(purchased_state="OR",beverage="spirits")["status"] == "not_covered"

def test_other_states_never_invent_refund():
    assert check(purchased_state="TX")["status"] == "no_program"
    assert check(purchased_state="MI")["status"] == "program_needs_check"
    assert check(purchased_state="MI")["per_container_cents"] is None

def test_api_validation_and_no_provider_calls():
    with TestClient(app) as client:
        assert client.post("/api/deposits/check",json={"purchased_state":"CA","size_oz":24,
            "beverage":"water","material":"plastic","quantity":10}).json()["estimated_total_cents"] == 100
        assert client.post("/api/deposits/check",json={"purchased_state":"ZZ"}).status_code == 422
        assert client.post("/api/deposits/check",json={"purchased_state":"CA","quantity":0}).status_code == 422
        assert client.post("/api/deposits/scan",files={"image":("a.gif",b"x","image/gif")}).status_code == 415
