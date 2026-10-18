"""Deposit rules and quiz reward regression coverage.

Provider calls are mocked; source links/rules still require periodic review.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.deposit_rules import DepositRequest, calculate, STATE_SOURCES

HEAD = {"X-WasteLens-Request": "1"}

def value(state,drink="soda",material="aluminum",ounces=12,count=1,paid="yes",resin="unknown"):
    return calculate(DepositRequest(state=state,drink=drink,material=material,
        ounces=ounces,count=count,paid_in_state=paid,resin=resin))

@pytest.mark.parametrize("state,expected", [
    ("CA",5),("CT",10),("HI",5),("IA",5),("ME",5),
    ("MA",5),("MI",10),("NY",5),("OR",10),("VT",5),
])
def test_ten_state_soda_deposits(state,expected):
    out=value(state)
    assert out["status"]=="yes"
    assert out["per_container_cents"]==expected
    assert out["total_cents"]==expected
    assert out["source_url"].startswith("https://")
    assert out["state_tip"]

def test_state_specific_edge_cases():
    assert len(STATE_SOURCES)==10
    assert value("CA",ounces=23.99)["total_cents"]==5
    assert value("CA",ounces=24)["total_cents"]==10
    assert value("CA","wine","pouch",12,count=4)["total_cents"]==100
    assert value("CA","juice","carton")["status"]=="no"
    assert value("CT","water","plastic",ounces=5)["status"]=="no"
    assert value("CT","water","plastic",ounces=16)["total_cents"]==10
    assert value("CT","wine")["status"]=="no"
    assert value("HI","water","plastic",ounces=16,resin="unknown")["status"]=="check"
    assert value("HI","water","plastic",ounces=16,resin="pet1")["total_cents"]==5
    assert value("HI","water","plastic",ounces=70,resin="pet1")["status"]=="no"
    assert value("IA","water")["status"]=="no"
    assert value("IA","wine","glass")["total_cents"]==5
    assert value("ME","liquor","glass")["total_cents"]==15
    assert value("ME","juice","glass")["status"]=="check"
    assert value("MA","water","plastic")["status"]=="no"
    assert value("MA","sparkling_water","plastic")["total_cents"]==5
    assert value("MI","water","plastic")["status"]=="no"
    assert value("MI","mixed_alcohol","aluminum")["total_cents"]==10
    assert value("NY","sports_energy","plastic")["status"]=="no"
    assert value("NY","water","plastic",ounces=16)["total_cents"]==5
    assert value("OR","wine","aluminum",ounces=12)["total_cents"]==10
    assert value("OR","wine","glass",ounces=12)["status"]=="no"
    assert value("OR","juice","glass",ounces=2)["status"]=="no"
    assert value("OR","juice","glass",ounces=12)["total_cents"]==10
    assert value("VT","liquor","glass")["total_cents"]==15
    assert value("VT","water","plastic",resin="pet1")["status"]=="no"
    assert value("VT","soda","plastic",resin="unknown")["status"]=="check"
    assert value("VT","soda","plastic",resin="pet1")["total_cents"]==5

def test_payout_not_guaranteed_if_not_paid_in_selected_state():
    x=value("OR",count=100,paid="no")
    assert x["total_cents"]==0 and x["status"]=="no"
    maybe=value("OR",count=100,paid="unsure")
    assert maybe["total_cents"]==1000 and maybe["status"]=="check"
    assert not maybe["amount_is_confirmed"]
    yes=value("CA",count=100,paid="yes")
    assert yes["total_cents"]==500 and not yes["amount_is_confirmed"]

def test_invalid_inputs_do_not_produce_unbounded_payout():
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        DepositRequest(state="CA",drink="soda",material="aluminum",ounces=12,count=999999)
    with pytest.raises(pydantic.ValidationError):
        DepositRequest(state="CA",drink="soda",material="aluminum",ounces=-1,count=4)

@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("WASTELENS_DB",str(tmp_path/"deposit.sqlite3"))
    monkeypatch.delenv("WASTELENS_ADMIN_EMAIL",raising=False)
    monkeypatch.delenv("WASTELENS_ADMIN_PASSWORD",raising=False)
    with TestClient(app) as c:
        yield c

def signup(c,email):
    res=c.post("/api/auth/signup",headers=HEAD,
        json={"name":"Bottle Student","email":email,"password":"safe-password-23456"})
    assert res.status_code==200,res.text

def quiz(c,answers):
    return c.post("/api/deposit/quiz/submit",headers=HEAD,json={"answers":answers})

def test_quiz_must_be_scored_on_backend_with_single_reward(client):
    correct=["ca10","mi_no","or_can","hi_fee","same_state"]
    assert client.get("/api/deposit/quiz/progress").json()["awarded"] is False
    assert client.post("/api/deposit/quiz/submit",json={"answers":correct}).status_code==403
    anonymous=quiz(client,correct)
    assert anonymous.status_code==200
    assert anonymous.json()["score"]==5 and anonymous.json()["earned_xp"]==0
    signup(client,"quizstudent@example.org")
    miss=quiz(client,["no","no","no","no","no"])
    assert miss.json()["passed"] is False
    assert miss.json()["earned_xp"]==0
    assert client.get("/api/leaderboard").json()["me"]["xp"]==0
    won=quiz(client,correct)
    assert won.json()["score"]==5 and won.json()["earned_xp"]==30
    assert won.json()["unlocked_badge"]["name"]=="Bottle Explorer"
    assert quiz(client,correct).json()["earned_xp"]==0
    state=client.get("/api/leaderboard").json()["me"]
    assert state["xp"]==30
    assert state["badges"][-1]["unlocked"] is True
    assert state["level_progress"]==30
    assert client.get("/api/deposit/quiz/progress").json()["awarded"] is True
    client.post("/api/auth/logout",headers=HEAD)
    signup(client,"otherquiz@example.org")
    assert client.get("/api/leaderboard").json()["me"]["xp"]==0

def test_quiz_correct_but_not_perfect_passing(client):
    signup(client,"fourcorrect@example.org")
    out=quiz(client,["ca10","mi_no","or_can","hi_fee","wrong"])
    assert out.status_code==200 and out.json()["score"]==4
    assert out.json()["earned_xp"]==30

def test_inspect_photo_uses_existing_ai_and_never_awards_xp(client,monkeypatch):
    from app.deposit_scan import DepositPhotoSuggestion
    import app.main as main
    called=[]
    def fake(photo):
        called.append(photo)
        return DepositPhotoSuggestion(drink="soda",material="aluminum",
            ounces=12,visible_mark="CA CRV",confidence="clear",
            guidance="Check where the deposit was paid.")
    monkeypatch.setattr(main,"inspect_deposit_photo",fake)
    r=client.post("/api/deposit/inspect",files={"image":("can.jpg",b"photo", "image/jpeg")})
    assert r.status_code==200,r.text
    assert r.json()["suggestion"]["visible_mark"]=="CA CRV"
    assert r.json()["deposit_verified"] is False
    assert called==[b"photo"]
    assert client.post("/api/deposit/inspect",files={"image":("can.txt",b"x","text/plain")}).status_code==415
