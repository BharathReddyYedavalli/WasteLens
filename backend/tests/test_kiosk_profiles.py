"""Site-specific kiosk setup is admin-only and safe by default."""
from fastapi.testclient import TestClient
from app.main import app

HEADERS={"X-WasteLens-Request":"1"}

def profile():
    return {
        "organization":"Main office cafeteria",
        "source":"Facility manager's approved accepted-material list",
        "rules_checked":True,
        "bins":[{"id":"bin_1","name":"Mixed Recycling"},{"id":"bin_2","name":"Landfill"},{"id":"bin_3","name":"Compost"}],
        "rules":[
            {"item_type":"empty_plastic_bottle","bin_id":"bin_1"},
            {"item_type":"plastic_cutlery","bin_id":"bin_2"},
            {"item_type":"food_scraps","bin_id":"bin_3"},
        ],
    }


def test_rules_are_absent_until_explicitly_configured(tmp_path,monkeypatch):
    monkeypatch.setenv("WASTELENS_DB",str(tmp_path/"empty.sqlite"))
    with TestClient(app) as c:
        data=c.get("/api/kiosk/profile").json()
        assert data["configured"] is False
        assert data["bins"]==[] and data["rules"]==[]


def test_site_rules_require_admin_header_and_confirmation(tmp_path,monkeypatch):
    monkeypatch.setenv("WASTELENS_DB",str(tmp_path/"security.sqlite"))
    monkeypatch.setenv("WASTELENS_ADMIN_EMAIL","owner@example.org")
    monkeypatch.setenv("WASTELENS_ADMIN_PASSWORD","test-password-long-enough-123")
    with TestClient(app) as c:
        assert c.put("/api/kiosk/profile",headers=HEADERS,json=profile()).status_code==401
        user=c.post("/api/auth/signup",headers=HEADERS,json={
            "name":"Student","email":"student@example.org","password":"test-password-long-enough-123"
        })
        assert user.status_code==200
        assert c.put("/api/kiosk/profile",headers=HEADERS,json=profile()).status_code==403
        c.post("/api/auth/logout",headers=HEADERS)
        admin=c.post("/api/auth/login",headers=HEADERS,json={
            "email":"owner@example.org","password":"test-password-long-enough-123"
        })
        assert admin.status_code==200,admin.text
        assert c.put("/api/kiosk/profile",json=profile()).status_code==403
        p=profile()
        p["rules_checked"]=False
        assert c.put("/api/kiosk/profile",headers=HEADERS,json=p).status_code==422
        assert c.get("/api/kiosk/profile").json()["configured"] is False


def test_admin_config_roundtrip_and_existing_database_reopen(tmp_path,monkeypatch):
    path=tmp_path/"configured.sqlite"
    monkeypatch.setenv("WASTELENS_DB",str(path))
    monkeypatch.setenv("WASTELENS_ADMIN_EMAIL","owner@example.org")
    monkeypatch.setenv("WASTELENS_ADMIN_PASSWORD","test-password-long-enough-123")
    with TestClient(app) as c:
        assert c.post("/api/auth/login",headers=HEADERS,json={
            "email":"owner@example.org","password":"test-password-long-enough-123"
        }).status_code==200
        r=c.put("/api/kiosk/profile",headers=HEADERS,json=profile())
        assert r.status_code==200,r.text
        saved=r.json()
        assert saved["organization"]=="Main office cafeteria"
        assert saved["reviewed_at"]
        assert saved["rules"][1]["item_type"]=="plastic_cutlery"
        assert saved["bins"][2]["name"]=="Compost"
        c.post("/api/auth/logout",headers=HEADERS)
        assert c.get("/api/kiosk/profile").json()["configured"] is True
    # Opening a new connection does not delete the site's configuration.
    with TestClient(app) as c:
        again=c.get("/api/kiosk/profile").json()
        assert again["rules"]==saved["rules"]
        assert again["source"]==saved["source"]


def test_invalid_sites_rejected_without_overwriting_valid_configuration(tmp_path,monkeypatch):
    monkeypatch.setenv("WASTELENS_DB",str(tmp_path/"validation.sqlite"))
    monkeypatch.setenv("WASTELENS_ADMIN_EMAIL","owner@example.org")
    monkeypatch.setenv("WASTELENS_ADMIN_PASSWORD","test-password-long-enough-123")
    with TestClient(app) as c:
        assert c.post("/api/auth/login",headers=HEADERS,json={
            "email":"owner@example.org","password":"test-password-long-enough-123"
        }).status_code==200
        assert c.put("/api/kiosk/profile",headers=HEADERS,json=profile()).status_code==200
        cases=[]
        p=profile();p["rules"]=[{"item_type":"empty_plastic_bottle","bin_id":"bin_9"}];cases.append(p)
        p=profile();p["rules"]=p["rules"]*2;cases.append(p)
        p=profile();p["bins"][1]["name"]="Mixed Recycling";cases.append(p)
        p=profile();p["rules"]=[{"item_type":"lithium_battery","bin_id":"bin_1"}];cases.append(p)
        p=profile();p["bins"]=p["bins"][:1];cases.append(p)
        for payload in cases:
            r=c.put("/api/kiosk/profile",headers=HEADERS,json=payload)
            assert r.status_code==422,(r.status_code,r.text)
        assert len(c.get("/api/kiosk/profile").json()["rules"])==3
