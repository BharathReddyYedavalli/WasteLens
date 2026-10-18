"""Habits are per-account, based on saved facts, not invented CO2 savings."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.accounts import record_scan
from app.vision import ItemAnalysis

def predicted():
    return ItemAnalysis(item_name="Bottle",visual_description="Visible blue bottle",
        material_guess="Unknown",identification="likely",route="reuse_first",route_title="Reuse",
        disposal_steps=[],reuse_ideas=[],cautions=[],follow_up_question="",
        location_helpful=False,collection_search_term="").model_dump()

def signup(client,email,name):
    return client.post("/api/auth/signup",
        headers={"X-WasteLens-Request":"1"},
        json={"name":name,"email":email,"password":"safe-password-9876"})

def test_habits_do_not_expose_other_accounts(tmp_path,monkeypatch):
    monkeypatch.setenv("WASTELENS_DB",str(tmp_path/"habits.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL",raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD",raising=False)
    with TestClient(app) as client:
        assert client.get("/api/habits").status_code == 401
        signed=signup(client,"first@example.org","First")
        assert signed.status_code==200
        item=record_scan(signed.json()["id"],"model",predicted(),photo_digest="hash-one")
        logged=client.post(f"/api/scans/{item}/action",
            headers={"X-WasteLens-Request":"1"},json={"action":"reused"})
        assert logged.status_code==200
        report=client.get("/api/habits").json()
        assert len(report["days"])==7
        assert report["seven_day_scans"]==1
        assert report["seven_day_actions"]==1
        assert report["reuse_and_donation"]==1
        assert report["recorded_actions"]["reused"]==1
        assert report["verified_impact"] is False
        assert "carbon" not in report
        client.post("/api/auth/logout",headers={"X-WasteLens-Request":"1"})
        assert signup(client,"other@example.org","Other").status_code==200
        other=client.get("/api/habits").json()
        assert other["total_scans"]==0
        assert other["reuse_and_donation"]==0
