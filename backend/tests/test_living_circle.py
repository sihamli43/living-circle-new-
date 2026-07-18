"""Backend tests for Living Circle — email-based auth (JWT)."""
import os
import random
import re
import string

import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL", "http://localhost:8001"
).rstrip("/")
API = f"{BASE_URL}/api"


def _email() -> str:
    tag = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"u_{tag}@test.local"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _auth(s, email=None):
    """Returns (email, jwt). Reads dev_code if present (no SMTP/Brevo); otherwise
    fetches the latest stored code directly from MongoDB."""
    email = email or _email()
    r = s.post(f"{API}/auth/send-code", json={"email": email})
    assert r.status_code == 200, r.text
    code = r.json().get("dev_code")
    if not code:
        # Real email is configured (Brevo). Pull the code from Mongo for the test.
        from pymongo import MongoClient
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        rec = mc[os.environ.get("DB_NAME", "test_database")].otp_codes.find_one({"email": email})
        assert rec, "no otp record found"
        code = rec["code"]
    r = s.post(f"{API}/auth/verify-code", json={"email": email, "code": code})
    assert r.status_code == 200, r.text
    return email, r.json()["token"]


# ---------- Auth ----------
class TestAuth:
    def test_send_code_creates_dev_code(self, session):
        """When Brevo is unconfigured the response includes dev_code; with Brevo
        configured we just expect sent=True."""
        r = session.post(f"{API}/auth/send-code", json={"email": _email()})
        assert r.status_code == 200
        body = r.json()
        assert body["sent"] is True
        if "dev_code" in body:
            assert re.fullmatch(r"\d{6}", body["dev_code"])

    def test_send_code_rejects_invalid_email(self, session):
        r = session.post(f"{API}/auth/send-code", json={"email": "not-an-email"})
        assert r.status_code == 400

    def test_send_code_rejects_fixture_account(self, session):
        r = session.post(f"{API}/auth/send-code", json={"email": "seed1@example.com"})
        assert r.status_code == 400
        assert "cannot" in r.json()["detail"].lower()

    def test_send_code_rate_limit_60s(self, session):
        e = _email()
        r1 = session.post(f"{API}/auth/send-code", json={"email": e})
        assert r1.status_code == 200
        r2 = session.post(f"{API}/auth/send-code", json={"email": e})
        assert r2.status_code == 429

    def test_verify_code_success(self, session):
        e = _email()
        r = session.post(f"{API}/auth/send-code", json={"email": e})
        body = r.json()
        code = body.get("dev_code")
        if not code:
            from pymongo import MongoClient
            mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
            code = mc[os.environ.get("DB_NAME", "test_database")].otp_codes.find_one({"email": e})["code"]
        r = session.post(f"{API}/auth/verify-code", json={"email": e, "code": code})
        assert r.status_code == 200
        body = r.json()
        assert body["token"].count(".") == 2
        assert body["onboarded"] is False

    def test_verify_code_wrong(self, session):
        e = _email()
        session.post(f"{API}/auth/send-code", json={"email": e})
        r = session.post(f"{API}/auth/verify-code", json={"email": e, "code": "000000"})
        assert r.status_code == 400

    def test_verify_code_single_use(self, session):
        e = _email()
        session.post(f"{API}/auth/send-code", json={"email": e})
        from pymongo import MongoClient
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        code = mc[os.environ.get("DB_NAME", "test_database")].otp_codes.find_one({"email": e})["code"]
        r1 = session.post(f"{API}/auth/verify-code", json={"email": e, "code": code})
        assert r1.status_code == 200
        r2 = session.post(f"{API}/auth/verify-code", json={"email": e, "code": code})
        assert r2.status_code == 400


# ---------- Profile (JWT-protected) ----------
class TestProfile:
    def test_me_requires_token(self, session):
        r = session.get(f"{API}/profiles/me")
        assert r.status_code == 401

    def test_me_rejects_garbage_token(self, session):
        r = session.get(f"{API}/profiles/me", headers={"Authorization": "not.a.jwt"})
        assert r.status_code == 401

    def test_me_returns_profile(self, session):
        email, token = _auth(session)
        r = session.get(f"{API}/profiles/me", headers={"Authorization": token})
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == email
        assert "user_id" in body
        assert "_id" not in body

    def test_update_me_merges_lifestyle_and_listing(self, session):
        _, token = _auth(session)
        h = {"Authorization": token}
        session.put(f"{API}/profiles/me",
                    json={"name": "TEST_X", "age": 27,
                          "lifestyle": {"food": "Veg"},
                          "listing": {"rent": 20000, "deposit": 30000}},
                    headers=h)
        # Partial update should merge, not replace.
        r = session.put(f"{API}/profiles/me",
                        json={"lifestyle": {"smoking": "No"},
                              "listing": {"furnished": "Furnished"}},
                        headers=h)
        assert r.status_code == 200
        body = r.json()
        assert body["lifestyle"]["food"] == "Veg"
        assert body["lifestyle"]["smoking"] == "No"
        assert body["listing"]["rent"] == 20000
        assert body["listing"]["furnished"] == "Furnished"


# ---------- Discover ----------
class TestDiscover:
    def test_discover_returns_seeded(self, session):
        _, token = _auth(session)
        session.put(f"{API}/profiles/me", json={
            "name": "TEST_Disc", "onboarded": True,
            "lifestyle": {"food": "Veg", "smoking": "No", "drinking": "No",
                          "sleep": "Early bird", "cleanliness": "Very tidy",
                          "guests": "Rarely", "pets": "No pets"}
        }, headers={"Authorization": token})
        r = session.get(f"{API}/profiles/discover", headers={"Authorization": token})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 15
        for d in data:
            assert "_id" not in d
            assert "compatibility" in d
            assert "shared" in d

    def test_discover_filters(self, session):
        _, token = _auth(session)
        h = {"Authorization": token}
        session.put(f"{API}/profiles/me", json={"onboarded": True}, headers=h)
        r = session.get(f"{API}/profiles/discover?gender=female", headers=h)
        assert r.status_code == 200
        for d in r.json():
            assert (d.get("gender") or "").lower() == "female"
        r = session.get(f"{API}/profiles/discover?listing_type=has_place", headers=h)
        for d in r.json():
            assert d["listing_type"] == "has_place"


# ---------- Swipe / Match ----------
class TestSwipeMatch:
    def test_pass_excludes_from_discover(self, session):
        _, token = _auth(session)
        h = {"Authorization": token}
        session.put(f"{API}/profiles/me", json={"onboarded": True}, headers=h)
        r = session.post(f"{API}/swipes",
                         json={"target_id": "seed-1", "direction": "pass"}, headers=h)
        assert r.status_code == 200
        assert r.json()["match"] is None
        ids = [d["user_id"] for d in session.get(f"{API}/profiles/discover", headers=h).json()]
        assert "seed-1" not in ids

    def test_mutual_like_creates_match(self, session):
        _, ta = _auth(session); _, tb = _auth(session)
        ha = {"Authorization": ta}; hb = {"Authorization": tb}
        a = session.get(f"{API}/profiles/me", headers=ha).json()
        b = session.get(f"{API}/profiles/me", headers=hb).json()
        session.put(f"{API}/profiles/me", json={"onboarded": True}, headers=ha)
        session.put(f"{API}/profiles/me", json={"onboarded": True}, headers=hb)
        r1 = session.post(f"{API}/swipes",
                          json={"target_id": b["user_id"], "direction": "like"}, headers=ha)
        assert r1.json()["match"] is None
        r2 = session.post(f"{API}/swipes",
                          json={"target_id": a["user_id"], "direction": "like"}, headers=hb)
        m = r2.json()["match"]
        assert m and "match_id" in m

    def test_cannot_swipe_self(self, session):
        _, t = _auth(session)
        me = session.get(f"{API}/profiles/me", headers={"Authorization": t}).json()
        r = session.post(f"{API}/swipes",
                         json={"target_id": me["user_id"], "direction": "like"},
                         headers={"Authorization": t})
        assert r.status_code == 400


# ---------- Messages ----------
class TestMessages:
    def test_send_and_get_messages(self, session):
        _, ta = _auth(session); _, tb = _auth(session)
        a = session.get(f"{API}/profiles/me", headers={"Authorization": ta}).json()
        b = session.get(f"{API}/profiles/me", headers={"Authorization": tb}).json()
        session.put(f"{API}/profiles/me", json={"onboarded": True}, headers={"Authorization": ta})
        session.put(f"{API}/profiles/me", json={"onboarded": True}, headers={"Authorization": tb})
        session.post(f"{API}/swipes",
                     json={"target_id": b["user_id"], "direction": "like"},
                     headers={"Authorization": ta})
        r = session.post(f"{API}/swipes",
                         json={"target_id": a["user_id"], "direction": "like"},
                         headers={"Authorization": tb})
        match_id = r.json()["match"]["match_id"]
        r = session.post(f"{API}/messages/{match_id}", json={"text": "TEST_hi"},
                         headers={"Authorization": ta})
        assert r.status_code == 200
        msgs = session.get(f"{API}/messages/{match_id}",
                           headers={"Authorization": tb}).json()
        assert any(m["text"] == "TEST_hi" for m in msgs)


# ---------- Block / Report ----------
class TestBlockReport:
    def test_block_excludes_from_discover(self, session):
        _, t = _auth(session)
        h = {"Authorization": t}
        session.put(f"{API}/profiles/me", json={"onboarded": True}, headers=h)
        session.post(f"{API}/users/seed-2/block", headers=h)
        ids = [d["user_id"] for d in session.get(f"{API}/profiles/discover", headers=h).json()]
        assert "seed-2" not in ids

    def test_report(self, session):
        _, t = _auth(session)
        r = session.post(f"{API}/users/seed-3/report", headers={"Authorization": t})
        assert r.status_code == 200


# ---------- Seed / compatibility ----------
class TestSeed:
    def test_seeded_profiles_exist(self, session):
        _, t = _auth(session)
        ids = [d["user_id"] for d in session.get(f"{API}/profiles/discover",
                                                 headers={"Authorization": t}).json()]
        assert sum(1 for i in ids if i.startswith("seed-")) >= 15

    def test_compatibility_none_when_no_lifestyle(self, session):
        _, t = _auth(session)
        h = {"Authorization": t}
        session.put(f"{API}/profiles/me", json={"onboarded": True}, headers=h)
        body = session.get(f"{API}/profiles/seed-1", headers=h).json()
        assert body["compatibility"] is None

    def test_lifestyle_includes_religion_optional(self, session):
        # Religion is now part of the Lifestyle model again (cultural compatibility).
        # Seeded profiles populate it; verify the field exists in the schema.
        _, t = _auth(session)
        body = session.get(f"{API}/profiles/seed-1", headers={"Authorization": t}).json()
        ls = body.get("lifestyle") or {}
        assert "religion" in ls
        assert ls["religion"] in {"Hindu", "Muslim", "Christian", "Sikh",
                                  "Buddhist", "Jain", "Other", "Prefer not to say"}
