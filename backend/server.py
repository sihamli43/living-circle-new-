"""Living Circle — Roommate finder backend.

FastAPI + MongoDB. Passwordless email auth (6-digit code → JWT).
Photos as base64. All routes prefixed with /api.
"""
from __future__ import annotations

import logging
import math
import os
import random
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Header, HTTPException, Request, WebSocket, WebSocketDisconnect
from jwt import ExpiredSignatureError, InvalidTokenError
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("living-circle")

# ---------- Auth config ----------
JWT_SECRET = os.environ.get("JWT_SECRET", "").strip()
if not JWT_SECRET:
    JWT_SECRET = secrets.token_urlsafe(48)
    log.warning("JWT_SECRET not set — generated a random one. Tokens will be invalidated on restart.")
JWT_ALG = "HS256"
JWT_TTL_DAYS = 7

# ---------- Email config ----------
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "").strip()
FROM_EMAIL = os.environ.get("FROM_EMAIL", "no-reply@livingcircle.app").strip()
FROM_NAME = os.environ.get("FROM_NAME", "Living Circle").strip()
BREVO_URL = "https://api.brevo.com/v3/smtp/email"
EMAIL_ENABLED = bool(BREVO_API_KEY and FROM_EMAIL)

OTP_TTL_MIN = 10
OTP_RATE_LIMIT_SEC = 60
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
LOCALITY_RE = re.compile(r"^[A-Za-z\s\-]+$")
SKIP = "Prefer not to say"

# ---------- Admin config ----------
# QA-only: creates/removes test-bot profiles via X-Admin-Key header.
# No fallback key — if unset, the endpoint refuses all requests rather than
# silently running unprotected.
ADMIN_KEY = os.environ.get("ADMIN_KEY", "").strip()

# ---------- Billing config ----------
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "").strip()
STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "").strip()
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
BILLING_ENABLED = bool(STRIPE_SECRET_KEY and STRIPE_PRICE_ID)
FREE_MATCH_LIMIT = 3
if BILLING_ENABLED:
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
else:
    log.warning("Stripe not configured (STRIPE_SECRET_KEY/STRIPE_PRICE_ID missing) — billing endpoints disabled.")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class SendCodeIn(BaseModel):
    email: str


class VerifyCodeIn(BaseModel):
    email: str
    code: str = Field(min_length=6, max_length=6)


class Lifestyle(BaseModel):
    # Core (7) — used in compatibility scoring with high weight.
    food: Optional[str] = None
    smoking: Optional[str] = None
    drinking: Optional[str] = None
    sleep: Optional[str] = None
    cleanliness: Optional[str] = None
    guests: Optional[str] = None
    pets: Optional[str] = None
    # Cultural compatibility.
    religion: Optional[str] = None
    # Extended (6) — informational + light-weight scoring.
    work_timing: Optional[str] = None
    cooking: Optional[str] = None
    noise: Optional[str] = None
    relationship_status: Optional[str] = None  # info only, not scored
    overnight_guests: Optional[str] = None
    sharing_habits: Optional[str] = None


class Profile(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    photo: Optional[str] = None  # base64 / data URI
    bio: Optional[str] = None
    occupation: Optional[str] = None
    org: Optional[str] = None
    hometown: Optional[str] = None
    languages: List[str] = []
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    localities: List[str] = []
    move_in: Optional[str] = None  # "YYYY-MM"
    listing_type: Optional[str] = None
    lifestyle: Lifestyle = Field(default_factory=Lifestyle)
    state: Optional[str] = None          # home state, e.g. "Tamil Nadu" — where they're originally from
    city: Optional[str] = None            # home city, e.g. "Chennai"
    current_state: Optional[str] = None   # where they live right now, e.g. "Karnataka"
    current_city: Optional[str] = None    # e.g. "Bangalore"
    current_locality: Optional[str] = None  # e.g. "Indiranagar"
    onboarded: bool = False
    can_login: bool = True
    is_bot: bool = False
    plan_type: str = "free"                # "free" | "premium"
    customer_id: Optional[str] = None       # Stripe customer id
    subscription_id: Optional[str] = None   # Stripe subscription id
    subscription_status: Optional[str] = None
    billing_email: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    photo: Optional[str] = None
    bio: Optional[str] = None
    occupation: Optional[str] = None
    org: Optional[str] = None
    hometown: Optional[str] = None
    languages: Optional[List[str]] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    localities: Optional[List[str]] = None
    move_in: Optional[str] = None
    listing_type: Optional[str] = None
    lifestyle: Optional[Lifestyle] = None
    onboarded: Optional[bool] = None
    state: Optional[str] = None
    city: Optional[str] = None
    current_state: Optional[str] = None
    current_city: Optional[str] = None
    current_locality: Optional[str] = None

    @field_validator("current_locality")
    @classmethod
    def _validate_current_locality(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not (2 <= len(v) <= 50) or not LOCALITY_RE.match(v):
            raise ValueError(
                "current_locality must be 2-50 characters, letters/spaces/hyphens only"
            )
        return v


class SwipeIn(BaseModel):
    target_id: str
    direction: str


class MessageIn(BaseModel):
    text: str


class SafetyReportIn(BaseModel):
    reason: str
    details: Optional[str] = None


# ---------- JWT helpers ----------
def issue_jwt(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=JWT_TTL_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> str:
    payload = jwt.decode(
        token, JWT_SECRET, algorithms=[JWT_ALG],
        options={"require": ["exp", "sub"]},
    )
    sub = payload.get("sub")
    if not isinstance(sub, str):
        raise InvalidTokenError("Invalid sub claim")
    return sub


# ---------- Email ----------
def _otp_html(code: str) -> str:
    return f"""<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,sans-serif;background:#FDFBF7;padding:32px;color:#1A1D1E">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
    <h1 style="color:#0A878A;font-size:24px;margin:0 0 8px">Living Circle</h1>
    <p style="color:#5C6164;margin:0 0 24px">Find your people, find your place.</p>
    <p style="font-size:15px;line-height:22px;margin:0 0 12px">Your verification code is:</p>
    <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0A878A;background:#D9F0F0;padding:16px 24px;border-radius:12px;text-align:center;margin:0 0 24px">{code}</div>
    <p style="font-size:13px;color:#5C6164;margin:0">This code expires in {OTP_TTL_MIN} minutes. If you didn't request it, just ignore this email.</p>
  </div>
</body></html>"""


async def send_otp_email(to_email: str, code: str) -> bool:
    if not EMAIL_ENABLED:
        log.warning("Brevo not configured — dev mode. email=%s code=%s", to_email, code)
        return False
    payload = {
        "sender": {"name": FROM_NAME, "email": FROM_EMAIL},
        "to": [{"email": to_email}],
        "subject": "Your Living Circle login code",
        "htmlContent": _otp_html(code),
        "textContent": (
            f"Your Living Circle verification code is: {code}\n\n"
            f"It expires in {OTP_TTL_MIN} minutes. If you didn't request this, ignore this email."
        ),
    }
    headers = {"api-key": BREVO_API_KEY, "accept": "application/json", "content-type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as cx:
            r = await cx.post(BREVO_URL, json=payload, headers=headers)
        if 200 <= r.status_code < 300:
            log.info("Brevo email sent to %s (status=%s)", to_email, r.status_code)
            return True
        log.error("Brevo send failed (status=%s body=%s) to=%s", r.status_code, r.text[:500], to_email)
    except Exception as e:
        log.exception("Brevo send error to=%s: %s", to_email, e)
    log.warning("DEV FALLBACK after Brevo failure: email=%s code=%s", to_email, code)
    return False


def _norm_email(email: str) -> str:
    return (email or "").strip().lower()


def _gen_code() -> str:
    return f"{random.randint(0, 999_999):06d}"


# ---------- Auth dependency ----------
async def _load_user_by_token(raw_token: str) -> dict:
    """Shared by the REST Authorization-header dependency and the WS
    query-string token (RN's WebSocket can't set custom headers at connect time)."""
    raw = raw_token.strip()
    if raw.lower().startswith("bearer "):
        raw = raw[7:].strip()
    try:
        user_id = decode_jwt(raw)
    except ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    u = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(401, "User not found")
    return u


async def get_user(token: Optional[str]) -> dict:
    if not token:
        raise HTTPException(401, "Missing auth token")
    return await _load_user_by_token(token)


# ---------- Compatibility ----------
# Weights sum to 100. Religion 10 + 5 extended × 5 = 35. Core 7 = 65.
WEIGHTS: Dict[str, int] = {
    # Core (65)
    "food": 13, "smoking": 10, "drinking": 7, "sleep": 10,
    "cleanliness": 13, "guests": 6, "pets": 6,
    # Cultural (10)
    "religion": 10,
    # Extended (25). relationship_status is NOT scored (informational only).
    "work_timing": 5, "cooking": 5, "noise": 5,
    "overnight_guests": 5, "sharing_habits": 5,
}

LABELS: Dict[str, str] = {
    "food": "food", "smoking": "smoking", "drinking": "drinking",
    "sleep": "sleep schedule", "cleanliness": "cleanliness",
    "guests": "guests", "pets": "pets",
    "religion": "religion",
    "work_timing": "work schedule", "cooking": "cooking habits",
    "noise": "noise/music preference", "overnight_guests": "overnight guests",
    "sharing_habits": "sharing habits",
}


def _eligible(key: str, va: Any, vb: Any) -> bool:
    """Both answered; religion 'Prefer not to say' excluded from scoring."""
    if not va or not vb:
        return False
    if key == "religion" and (va == SKIP or vb == SKIP):
        return False
    return True


def _location_bonus(a: dict, b: dict) -> int:
    """Boost for living near each other, on top of the lifestyle score.

    Tiered (best match only) since locality implies city implies state — stacking
    all three would double-count the same fact. Home state is a separate,
    independent signal (cultural/regional affinity) so it adds on top.
    """
    bonus = 0
    if a.get("current_locality") and a.get("current_locality") == b.get("current_locality"):
        bonus = 30
    elif a.get("current_city") and a.get("current_city") == b.get("current_city"):
        bonus = 20
    elif a.get("current_state") and a.get("current_state") == b.get("current_state"):
        bonus = 10
    if a.get("state") and a.get("state") == b.get("state"):
        bonus += 5
    return bonus


def compatibility(a: dict, b: dict) -> Optional[int]:
    la = a.get("lifestyle") or {}
    lb = b.get("lifestyle") or {}
    score = 0
    total = 0
    for k, w in WEIGHTS.items():
        va, vb = la.get(k), lb.get(k)
        if _eligible(k, va, vb):
            total += w
            if va == vb:
                score += w
    if total == 0:
        return None
    base = (score / total) * 100
    return round(min(100, base + _location_bonus(a, b)))


def shared_prefs(a: dict, b: dict) -> List[str]:
    la = a.get("lifestyle") or {}
    lb = b.get("lifestyle") or {}
    out: List[str] = []
    for k, lbl in LABELS.items():
        va, vb = la.get(k), lb.get(k)
        if _eligible(k, va, vb) and va == vb:
            out.append(f"Same {lbl}: {va}")
    # Currently living nearby
    if a.get("current_locality") and a.get("current_locality") == b.get("current_locality"):
        out.append(f"Both in {a['current_locality']}")
    elif a.get("current_city") and a.get("current_city") == b.get("current_city"):
        out.append(f"Both live in {a['current_city']}")
    # Same hometown city
    if a.get("city") and a.get("city") == b.get("city"):
        out.append(f"Same hometown: {a['city']}")
    elif a.get("state") and a.get("state") == b.get("state"):
        out.append(f"Same home state: {a['state']}")
    overlap = set(a.get("localities", [])) & set(b.get("localities", []))
    if overlap:
        out.append(f"Loves {', '.join(list(overlap)[:2])}")
    langs = set(a.get("languages", [])) & set(b.get("languages", []))
    if langs:
        out.append(f"Speaks {', '.join(list(langs)[:2])}")
    return out[:5]


def public_profile(p: dict, viewer: Optional[dict] = None) -> dict:
    out = {
        "user_id": p["user_id"],
        "name": p.get("name"),
        "age": p.get("age"),
        "gender": p.get("gender"),
        "photo": p.get("photo"),
        "bio": p.get("bio"),
        "occupation": p.get("occupation"),
        "org": p.get("org"),
        "state": p.get("state"),
        "city": p.get("city"),
        "current_state": p.get("current_state"),
        "current_city": p.get("current_city"),
        "current_locality": p.get("current_locality"),
        "languages": p.get("languages", []),
        "budget_min": p.get("budget_min"),
        "budget_max": p.get("budget_max"),
        "localities": p.get("localities", []),
        "move_in": p.get("move_in"),
        "listing_type": p.get("listing_type"),
        "lifestyle": p.get("lifestyle", {}),
    }
    if p.get("is_bot"):
        out["is_bot"] = True
    if viewer:
        out["compatibility"] = compatibility(viewer, p)
        out["shared"] = shared_prefs(viewer, p)
    return out


# ---------- Auth endpoints ----------
@api.post("/auth/send-code")
async def send_code(body: SendCodeIn):
    email = _norm_email(body.email)
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Invalid email")
    existing = await db.profiles.find_one({"email": email}, {"_id": 0})
    if existing and existing.get("can_login") is False:
        raise HTTPException(400, "This account cannot log in")
    now = datetime.now(timezone.utc)
    prior = await db.otp_codes.find_one({"email": email})
    if prior:
        last = prior.get("last_sent_at")
        if isinstance(last, datetime):
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            secs = (now - last).total_seconds()
            if secs < OTP_RATE_LIMIT_SEC:
                raise HTTPException(429, f"Please wait {int(OTP_RATE_LIMIT_SEC - secs)}s before requesting another code")
    code = _gen_code()
    expires_at = now + timedelta(minutes=OTP_TTL_MIN)
    await db.otp_codes.update_one(
        {"email": email},
        {"$set": {"email": email, "code": code, "expires_at": expires_at,
                  "last_sent_at": now, "consumed": False}},
        upsert=True,
    )
    sent = await send_otp_email(email, code)
    response: dict = {"sent": True}
    if not sent:
        response["dev_code"] = code
        response["hint"] = "Brevo not configured — code returned for development only."
    return response


@api.post("/auth/verify-code")
async def verify_code(body: VerifyCodeIn):
    email = _norm_email(body.email)
    code = (body.code or "").strip()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Invalid email")
    rec = await db.otp_codes.find_one({"email": email})
    if not rec or rec.get("code") != code:
        raise HTTPException(400, "Invalid code")
    if rec.get("consumed"):
        raise HTTPException(400, "Code already used")
    exp = rec.get("expires_at")
    if isinstance(exp, datetime) and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if not isinstance(exp, datetime) or exp <= datetime.now(timezone.utc):
        raise HTTPException(400, "Code expired")
    await db.otp_codes.update_one({"_id": rec["_id"]}, {"$set": {"consumed": True}})
    profile = await db.profiles.find_one({"email": email}, {"_id": 0})
    if profile and profile.get("can_login") is False:
        raise HTTPException(400, "This account cannot log in")
    if not profile:
        user_id = str(uuid.uuid4())
        profile = Profile(user_id=user_id, email=email).model_dump()
        await db.profiles.insert_one(profile)
    token = issue_jwt(profile["user_id"])
    return {"token": token, "onboarded": bool(profile.get("onboarded", False))}


@api.delete("/auth/logout")
async def logout():
    return {"ok": True}


# ---------- Profile ----------
@api.get("/profiles/me")
async def me(authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    return u


@api.put("/profiles/me")
async def update_me(body: ProfileUpdate, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "lifestyle" in updates and isinstance(updates["lifestyle"], dict):
        merged = {**(u.get("lifestyle") or {}), **updates["lifestyle"]}
        updates["lifestyle"] = merged
    await db.profiles.update_one({"user_id": u["user_id"]}, {"$set": updates})
    out = await db.profiles.find_one({"user_id": u["user_id"]}, {"_id": 0})
    return out


@api.delete("/profiles/me")
async def delete_me(authorization: Optional[str] = Header(None)):
    """Permanently delete the caller's account and every trace of it."""
    u = await get_user(authorization)
    uid = u["user_id"]

    matches = await db.matches.find({"users": uid}, {"_id": 0, "match_id": 1}).to_list(1000)
    match_ids = [m["match_id"] for m in matches]
    if match_ids:
        await db.messages.delete_many({"match_id": {"$in": match_ids}})
    await db.matches.delete_many({"users": uid})
    await db.swipes.delete_many({"$or": [{"user_id": uid}, {"target_id": uid}]})
    await db.reports.delete_many({"$or": [{"by": uid}, {"target": uid}]})
    await db.safety_reports.delete_many({"$or": [{"reporter_id": uid}, {"reported_user_id": uid}]})
    await db.id_verifications.delete_many({"user_id": uid})
    await db.otp_codes.delete_many({"email": u["email"]})
    await db.profiles.update_many({}, {"$pull": {"blocked": uid}})
    await db.profiles.delete_one({"user_id": uid})
    await db.deleted_accounts.insert_one({"user_id": uid, "email": u["email"], "deleted_at": datetime.now(timezone.utc)})

    log.warning("User %s deleted their account", uid)
    return {"status": "success", "message": "Account deleted successfully"}


@api.get("/profiles/discover")
async def discover(
    authorization: Optional[str] = Header(None),
    budget_min: Optional[int] = None,
    budget_max: Optional[int] = None,
    locality: Optional[str] = None,
    food: Optional[str] = None,
    gender: Optional[str] = None,
    listing_type: Optional[str] = None,
):
    u = await get_user(authorization)
    swiped = await db.swipes.find({"user_id": u["user_id"]}, {"_id": 0, "target_id": 1}).to_list(2000)
    swiped_ids = {s["target_id"] for s in swiped}
    blocked = set(u.get("blocked", []))
    exclude = swiped_ids | blocked | {u["user_id"]}
    q: dict = {
        "onboarded": True,
        "user_id": {"$nin": list(exclude)},
    }
    if locality:
        q["localities"] = {"$regex": locality, "$options": "i"}
    else:
        q["localities"] = {"$in": CITY_LOCALITIES["Bangalore"]}
    if gender:
        q["gender"] = {"$regex": f"^{gender}$", "$options": "i"}
    if food:
        q["lifestyle.food"] = food
    if listing_type:
        q["listing_type"] = listing_type
    docs = await db.profiles.find(q, {"_id": 0}).to_list(200)
    if budget_min is not None or budget_max is not None:
        bmn = budget_min if budget_min is not None else 0
        bmx = budget_max if budget_max is not None else 10**9
        docs = [d for d in docs
                if (d.get("budget_max") or 10**9) >= bmn and (d.get("budget_min") or 0) <= bmx]
    out = [public_profile(d, u) for d in docs]
    out.sort(key=lambda x: x.get("compatibility") if x.get("compatibility") is not None else -1, reverse=True)
    return out


@api.get("/profiles/{user_id}")
async def profile_by_id(user_id: str, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    p = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    return public_profile(p, u)


# ---------- Cities / Localities ----------
CITY_LOCALITIES: Dict[str, List[str]] = {
    "Bangalore": [
        # Central / Inner ring
        "MG Road", "Residency Road", "Richmond Town", "Lavelle Road",
        "Shivajinagar", "Cubbon Park", "Ulsoor", "Frazer Town", "Cox Town",
        "Cunningham Road", "Cleveland Town",
        # South Bangalore
        "Koramangala", "Indiranagar", "Domlur", "Ejipura", "HAL Layout",
        "HSR Layout", "BTM Layout", "Jayanagar", "JP Nagar", "Banashankari",
        "Basavanagudi", "Padmanabhanagar", "Kanakapura Road",
        "Bannerghatta Road", "Electronic City", "Hosa Road",
        # North Bangalore
        "Hebbal", "Yelahanka", "Banaswadi", "RT Nagar", "HBR Layout",
        "Kalyan Nagar", "New BEL Road", "Vidyaranyapura", "Peenya",
        "Sahakara Nagar", "Nagavara", "Thanisandra",
        # West Bangalore
        "Rajajinagar", "Malleswaram", "Basaveshwara Nagar", "Nagarbhavi",
        "Kengeri", "Mysore Road", "Tumkur Road",
        # East / Outer ring
        "Whitefield", "Marathahalli", "Sarjapur Road", "Bellandur",
        "Old Airport Road", "Viman Nagar", "KR Puram", "Mahadevapura",
        "Brookefield", "ITPL Road", "Kadubeesanahalli",
        # Tech corridors
        "Outer Ring Road", "Silk Board", "Devanahalli",
    ],
}
CITIES = ["Bangalore"]

# ---------- Location Helpers ----------
LOCALITY_COORDS: Dict[str, tuple] = {
    # Central
    "MG Road":            (12.9762, 77.6033),
    "Residency Road":     (12.9716, 77.5989),
    "Richmond Town":      (12.9634, 77.5987),
    "Lavelle Road":       (12.9699, 77.5967),
    "Shivajinagar":       (12.9850, 77.5997),
    "Cubbon Park":        (12.9768, 77.5932),
    "Ulsoor":             (12.9810, 77.6192),
    "Frazer Town":        (12.9914, 77.6208),
    "Cox Town":           (12.9929, 77.6098),
    "Cunningham Road":    (12.9927, 77.5855),
    "Cleveland Town":     (12.9896, 77.6149),
    # South
    "Koramangala":        (12.9352, 77.6245),
    "Indiranagar":        (12.9784, 77.6408),
    "Domlur":             (12.9609, 77.6390),
    "Ejipura":            (12.9457, 77.6232),
    "HAL Layout":         (12.9632, 77.6527),
    "HSR Layout":         (12.9116, 77.6389),
    "BTM Layout":         (12.9166, 77.6101),
    "Jayanagar":          (12.9254, 77.5938),
    "JP Nagar":           (12.9063, 77.5857),
    "Banashankari":       (12.9244, 77.5460),
    "Basavanagudi":       (12.9422, 77.5749),
    "Padmanabhanagar":    (12.9139, 77.5639),
    "Kanakapura Road":    (12.8940, 77.5720),
    "Bannerghatta Road":  (12.8954, 77.5979),
    "Electronic City":    (12.8399, 77.6770),
    "Hosa Road":          (12.8686, 77.6759),
    # North
    "Hebbal":             (13.0350, 77.5970),
    "Yelahanka":          (13.1006, 77.5963),
    "Banaswadi":          (13.0089, 77.6459),
    "RT Nagar":           (13.0218, 77.5968),
    "HBR Layout":         (13.0174, 77.6398),
    "Kalyan Nagar":       (13.0195, 77.6458),
    "New BEL Road":       (13.0198, 77.5527),
    "Vidyaranyapura":     (13.0759, 77.5569),
    "Peenya":             (13.0278, 77.5194),
    "Sahakara Nagar":     (13.0564, 77.5884),
    "Nagavara":           (13.0386, 77.6215),
    "Thanisandra":        (13.0576, 77.6349),
    # West
    "Rajajinagar":        (12.9990, 77.5546),
    "Malleswaram":        (13.0035, 77.5697),
    "Basaveshwara Nagar": (12.9955, 77.5448),
    "Nagarbhavi":         (12.9671, 77.5107),
    "Kengeri":            (12.9068, 77.4849),
    "Mysore Road":        (12.9439, 77.5265),
    "Tumkur Road":        (13.0330, 77.5068),
    # East / Outer ring
    "Whitefield":         (12.9698, 77.7499),
    "Marathahalli":       (12.9591, 77.6972),
    "Sarjapur Road":      (12.9010, 77.6859),
    "Bellandur":          (12.9253, 77.6785),
    "Old Airport Road":   (12.9572, 77.6547),
    "Viman Nagar":        (12.9898, 77.6272),
    "KR Puram":           (13.0087, 77.6903),
    "Mahadevapura":       (12.9954, 77.7064),
    "Brookefield":        (12.9729, 77.7197),
    "ITPL Road":          (12.9855, 77.7267),
    "Kadubeesanahalli":   (12.9386, 77.6967),
    # Tech corridors
    "Outer Ring Road":    (12.9253, 77.6770),
    "Silk Board":         (12.9170, 77.6226),
    "Devanahalli":        (13.2488, 77.7145),
}

# Curated shortlist for "smart location suggestions" — reuses LOCALITY_COORDS'
# lat/lng values for consistency; rent/vibe/safety are static estimates (no
# external data source), good enough for ranking, not for pricing decisions.
SUGGESTED_NEIGHBORHOODS: List[dict] = [
    {"name": "Koramangala",   "lat": 12.9352, "lng": 77.6245, "avg_rent": 18000,
     "vibe": "Young professionals, hip", "safety_score": 8,
     "amenities": ["metro", "restaurants", "cafes", "nightlife"]},
    {"name": "Indiranagar",   "lat": 12.9784, "lng": 77.6408, "avg_rent": 16000,
     "vibe": "Trendy, walkable, buzzing", "safety_score": 8,
     "amenities": ["metro", "restaurants", "shopping", "nightlife"]},
    {"name": "HSR Layout",    "lat": 12.9116, "lng": 77.6389, "avg_rent": 16000,
     "vibe": "Startup crowd, family-friendly", "safety_score": 8,
     "amenities": ["parks", "cafes", "supermarkets"]},
    {"name": "Whitefield",    "lat": 12.9698, "lng": 77.7499, "avg_rent": 14000,
     "vibe": "IT corridor, quieter, spacious", "safety_score": 7,
     "amenities": ["tech parks", "malls", "metro"]},
    {"name": "Jayanagar",     "lat": 12.9254, "lng": 77.5938, "avg_rent": 15000,
     "vibe": "Established, green, family-oriented", "safety_score": 9,
     "amenities": ["parks", "markets", "metro"]},
    {"name": "Marathahalli",  "lat": 12.9591, "lng": 77.6972, "avg_rent": 15000,
     "vibe": "Busy, well-connected, affordable", "safety_score": 7,
     "amenities": ["tech parks", "restaurants", "supermarkets"]},
    {"name": "BTM Layout",    "lat": 12.9166, "lng": 77.6101, "avg_rent": 14000,
     "vibe": "Central, budget-friendly, lively", "safety_score": 7,
     "amenities": ["restaurants", "metro", "supermarkets"]},
    {"name": "Electronic City","lat": 12.8399, "lng": 77.6770, "avg_rent": 12000,
     "vibe": "IT hub, quiet, budget-friendly", "safety_score": 7,
     "amenities": ["tech parks", "supermarkets"]},
    {"name": "Hebbal",        "lat": 13.0350, "lng": 77.5970, "avg_rent": 13000,
     "vibe": "North Bangalore, up-and-coming", "safety_score": 7,
     "amenities": ["lake", "restaurants", "highway access"]},
    {"name": "Malleswaram",   "lat": 13.0035, "lng": 77.5697, "avg_rent": 17000,
     "vibe": "Traditional, leafy, well-connected", "safety_score": 9,
     "amenities": ["metro", "markets", "parks"]},
]

# Each entry: (overpass_filter, result_type, search_radii_m)
# Radii expand until at least 1 result is found.
AMENITY_SEARCH_CONFIGS = [
    ('node["railway"="station"]',          "metro",       [1500, 4000, 10000]),
    ('node["highway"="bus_stop"]',          "bus",         [ 500, 1500,  4000]),
    ('node["amenity"="pharmacy"]',          "medical",     [ 800, 2500,  6000]),
    ('node["shop"="supermarket"]',          "supermarket", [1000, 3000,  8000]),
    ('node["amenity"="restaurant"]',        "restaurant",  [ 500, 1500,  3000]),
    ('node["leisure"="fitness_centre"]',    "gym",         [1500, 4000, 10000]),
    ('node["amenity"="atm"]',              "atm",          [ 500, 1500,  4000]),
    ('node["amenity"="hospital"]',         "hospital",     [2000, 6000, 15000]),
]


def travel_times(dist_km: float) -> dict:
    """Estimate travel times for Bangalore conditions."""
    return {
        "drive_min":   max(1, round(dist_km / 0.50)),   # ~30 km/h (Bangalore traffic)
        "transit_min": max(2, round(dist_km / 0.33)),   # ~20 km/h (bus/metro combo)
        "walk_min":    max(3, round(dist_km * 12)),      # ~5 km/h walking
    }


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


async def _overpass_query(query: str) -> List[dict]:
    """Run a single Overpass query and return elements."""
    try:
        async with httpx.AsyncClient(timeout=25.0, verify=False) as cx:
            r = await cx.post("https://overpass-api.de/api/interpreter", data={"data": query})
            if r.status_code == 200:
                return r.json().get("elements", [])
    except Exception as e:
        log.warning("Overpass error: %s", e)
    return []


async def fetch_nearby_amenities(lat: float, lng: float) -> List[dict]:
    """Fetch amenities using expanding radius — each type searches wider until results found."""
    amenities: List[dict] = []

    for overpass_filter, atype, radii in AMENITY_SEARCH_CONFIGS:
        found: List[dict] = []
        used_radius_m = radii[0]

        for radius_m in radii:
            query = f"""
[out:json][timeout:20];
{overpass_filter}(around:{radius_m},{lat},{lng});
out body;
"""
            elements = await _overpass_query(query)
            named = [e for e in elements if e.get("tags", {}).get("name", "").strip()]
            if named:
                used_radius_m = radius_m
                # Pick up to 3 closest named results
                with_dist = []
                for el in named:
                    el_lat, el_lng = el.get("lat", lat), el.get("lon", lng)
                    d = haversine_km(lat, lng, el_lat, el_lng)
                    with_dist.append((d, el))
                with_dist.sort(key=lambda x: x[0])
                for d, el in with_dist[:3]:
                    name = el["tags"]["name"].strip()
                    tt = travel_times(d)
                    entry: dict = {
                        "type": atype,
                        "name": name,
                        "distance_km": round(d, 2),
                        "drive_min":   tt["drive_min"],
                        "transit_min": tt["transit_min"],
                        "walk_min":    tt["walk_min"],
                        "lat": round(el.get("lat", lat), 6),
                        "lng": round(el.get("lon", lng), 6),
                    }
                    # Warn if found only by expanding beyond the initial radius
                    if used_radius_m > radii[0]:
                        entry["far_warning"] = f"Closest {atype} is {round(used_radius_m / 1000, 1)} km away"
                    found.append(entry)
                break  # found results at this radius — stop expanding

        amenities.extend(found)

    amenities.sort(key=lambda x: x["distance_km"])
    return amenities


@api.get("/matches/{match_id}/location")
async def match_location(match_id: str, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    m = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not m or u["user_id"] not in m["users"]:
        raise HTTPException(404, "Match not found")

    other_id = next(uid for uid in m["users"] if uid != u["user_id"])
    other = await db.profiles.find_one({"user_id": other_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Profile not found")

    other_localities = other.get("localities", [])
    my_localities = u.get("localities", [])

    other_loc = next((LOCALITY_COORDS[l] for l in other_localities if l in LOCALITY_COORDS), None)
    my_loc = next((LOCALITY_COORDS[l] for l in my_localities if l in LOCALITY_COORDS), None)

    if not other_loc:
        raise HTTPException(400, "Match location unavailable")

    distance_km: Optional[float] = None
    distance_tt: dict = {}
    if my_loc:
        distance_km = round(haversine_km(my_loc[0], my_loc[1], other_loc[0], other_loc[1]), 1)
        distance_tt = travel_times(distance_km)

    # Nearby amenities (cached in DB)
    cache_key = f"amenities_{other_loc[0]:.4f}_{other_loc[1]:.4f}"
    cached = await db.location_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached and cached.get("amenities") is not None:
        amenities = cached["amenities"]
    else:
        amenities = await fetch_nearby_amenities(other_loc[0], other_loc[1])  # expanding radius
        await db.location_cache.replace_one(
            {"key": cache_key},
            {"key": cache_key, "amenities": amenities, "at": now_iso()},
            upsert=True,
        )

    return {
        "match_name": other.get("name", ""),
        "match_locality": other_localities[0] if other_localities else None,
        "match_lat": other_loc[0],
        "match_lng": other_loc[1],
        "my_locality": my_localities[0] if my_localities else None,
        "my_lat": my_loc[0] if my_loc else None,
        "my_lng": my_loc[1] if my_loc else None,
        "distance_km": distance_km,
        "drive_min":   distance_tt.get("drive_min"),
        "transit_min": distance_tt.get("transit_min"),
        "walk_min":    distance_tt.get("walk_min"),
        "amenities": amenities,
    }


@api.post("/matches/{match_id}/request-location")
async def request_location(match_id: str, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    m = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not m or u["user_id"] not in m["users"]:
        raise HTTPException(404, "Match not found")
    other_id = next(uid for uid in m["users"] if uid != u["user_id"])
    # Store the request as a system message so the other user sees it
    await db.messages.insert_one({
        "id": str(uuid.uuid4()),
        "match_id": match_id,
        "sender_id": u["user_id"],
        "text": f"📍 {u.get('name', 'Your match')} has requested to view your neighborhood on the Location Explorer.",
        "is_system": True,
        "at": now_iso(),
    })
    return {"ok": True, "message": "Location request sent to your match"}


def _resolve_work_coords(user: dict) -> tuple:
    """Prefer exact work lat/lng, fall back to work_locality lookup."""
    lat, lng = user.get("work_lat"), user.get("work_lng")
    if (not (lat and lng)) and user.get("work_locality") in LOCALITY_COORDS:
        lat, lng = LOCALITY_COORDS[user["work_locality"]]
    return lat, lng


@api.get("/matches/{match_id}/suggest-locations")
async def suggest_locations(match_id: str, authorization: Optional[str] = Header(None)):
    """Rank a curated shortlist of Bangalore neighborhoods for two matched users,
    balancing distance between their current homes, both users' commutes, and rent.
    Uses haversine + the same travel-time heuristic as /matches/{match_id}/location —
    no external routing API involved.
    """
    u = await get_user(authorization)
    m = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not m or u["user_id"] not in m["users"]:
        raise HTTPException(404, "Match not found")

    other_id = next(uid for uid in m["users"] if uid != u["user_id"])
    other = await db.profiles.find_one({"user_id": other_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Profile not found")

    my_home = next((LOCALITY_COORDS[l] for l in u.get("localities", []) if l in LOCALITY_COORDS), None)
    other_home = next((LOCALITY_COORDS[l] for l in other.get("localities", []) if l in LOCALITY_COORDS), None)
    my_work = _resolve_work_coords(u)
    other_work = _resolve_work_coords(other)

    rents = [n["avg_rent"] for n in SUGGESTED_NEIGHBORHOODS]
    rent_min, rent_max = min(rents), max(rents)

    results = []
    for n in SUGGESTED_NEIGHBORHOODS:
        lat, lng = n["lat"], n["lng"]

        home_dist_me = haversine_km(lat, lng, my_home[0], my_home[1]) if my_home else None
        home_dist_other = haversine_km(lat, lng, other_home[0], other_home[1]) if other_home else None

        commute_me = None
        if my_work and my_work[0] is not None:
            commute_me = travel_times(haversine_km(lat, lng, my_work[0], my_work[1]))["drive_min"]
        commute_other = None
        if other_work and other_work[0] is not None:
            commute_other = travel_times(haversine_km(lat, lng, other_work[0], other_work[1]))["drive_min"]

        meeting_dist = haversine_km(lat, lng, other_home[0], other_home[1]) if other_home else None

        # Weighted score (lower components = better); normalized to a 0-100 "goodness" score.
        home_component = ((home_dist_me or 8) + (home_dist_other or 8)) * 0.2
        commute_component = ((commute_me or 30) + (commute_other or 30)) * 0.4
        meeting_component = (meeting_dist or 5) * 0.1
        rent_norm = (n["avg_rent"] - rent_min) / max(1, (rent_max - rent_min))  # 0..1
        rent_component = rent_norm * 10 * 0.3
        penalty = home_component + commute_component + meeting_component + rent_component
        score = round(max(0, 100 - penalty), 1)

        results.append({
            "name": n["name"], "lat": lat, "lng": lng,
            "avg_rent": n["avg_rent"], "vibe": n["vibe"],
            "safety_score": n["safety_score"], "amenities": n["amenities"],
            "score": score,
            "home_distance_km_me": round(home_dist_me, 1) if home_dist_me is not None else None,
            "home_distance_km_match": round(home_dist_other, 1) if home_dist_other is not None else None,
            "commute_min_me": commute_me,
            "commute_min_match": commute_other,
        })

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:5]


@api.get("/meta/cities")
async def get_cities():
    return {"cities": CITIES, "localities": CITY_LOCALITIES}


# ---------- Billing ----------
def _month_start_iso() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()


async def count_matches_this_month(user_id: str) -> int:
    return await db.matches.count_documents({
        "users": user_id,
        "created_at": {"$gte": _month_start_iso()},
    })


class CreateCheckoutOut(BaseModel):
    checkout_url: str


@api.post("/billing/create-checkout", response_model=CreateCheckoutOut)
async def create_checkout(authorization: Optional[str] = Header(None)):
    if not BILLING_ENABLED:
        raise HTTPException(503, "Billing is not configured on this server")
    u = await get_user(authorization)

    customer_id = u.get("customer_id")
    if not customer_id:
        customer = stripe.Customer.create(email=u["email"], metadata={"user_id": u["user_id"]})
        customer_id = customer["id"]
        await db.profiles.update_one({"user_id": u["user_id"]}, {"$set": {"customer_id": customer_id}})

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
        success_url="livingcircle://billing/success",
        cancel_url="livingcircle://billing/cancel",
        metadata={"user_id": u["user_id"]},
    )
    return {"checkout_url": session.url}


@api.post("/billing/webhook")
async def billing_webhook(request: Request):
    if not BILLING_ENABLED:
        raise HTTPException(503, "Billing is not configured on this server")
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid webhook signature")

    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        customer_id = obj.get("customer")
        await db.profiles.update_one(
            {"customer_id": customer_id},
            {"$set": {
                "plan_type": "premium",
                "subscription_id": obj.get("subscription"),
                "subscription_status": "active",
            }},
        )
    elif etype in ("customer.subscription.updated", "customer.subscription.deleted"):
        customer_id = obj.get("customer")
        status = obj.get("status", "canceled")
        plan_type = "premium" if status in ("active", "trialing") else "free"
        await db.profiles.update_one(
            {"customer_id": customer_id},
            {"$set": {"subscription_status": status, "plan_type": plan_type}},
        )

    return {"ok": True}


@api.get("/billing/status")
async def billing_status(authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    plan_type = u.get("plan_type", "free")
    used = await count_matches_this_month(u["user_id"])
    return {
        "plan_type": plan_type,
        "subscription_status": u.get("subscription_status"),
        "matches_this_month": used,
        "match_limit": None if plan_type == "premium" else FREE_MATCH_LIMIT,
        "billing_enabled": BILLING_ENABLED,
    }


# ---------- Swipes / Matches ----------
@api.post("/swipes")
async def swipe(body: SwipeIn, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    if body.target_id == u["user_id"]:
        raise HTTPException(400, "Cannot swipe self")
    if body.direction not in ("like", "pass"):
        raise HTTPException(400, "Invalid direction")
    target = await db.profiles.find_one({"user_id": body.target_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Target not found")
    await db.swipes.update_one(
        {"user_id": u["user_id"], "target_id": body.target_id},
        {"$set": {"direction": body.direction, "at": now_iso()}},
        upsert=True,
    )
    match = None
    paywalled = False
    if body.direction == "like":
        reverse = await db.swipes.find_one(
            {"user_id": body.target_id, "target_id": u["user_id"], "direction": "like"},
            {"_id": 0},
        )
        if reverse:
            key = sorted([u["user_id"], body.target_id])
            match_id = f"{key[0]}__{key[1]}"
            existing = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
            if existing:
                match = {"match_id": match_id, "user": public_profile(target, u)}
            elif u.get("plan_type", "free") != "premium" and await count_matches_this_month(u["user_id"]) >= FREE_MATCH_LIMIT:
                paywalled = True
            else:
                await db.matches.insert_one({"match_id": match_id, "users": key, "created_at": now_iso()})
                match = {"match_id": match_id, "user": public_profile(target, u)}
    return {"ok": True, "match": match, "paywalled": paywalled}


@api.get("/matches")
async def matches(authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    docs = await db.matches.find({"users": u["user_id"]}, {"_id": 0}).to_list(500)
    out = []
    for m in docs:
        other_id = [x for x in m["users"] if x != u["user_id"]][0]
        other = await db.profiles.find_one({"user_id": other_id}, {"_id": 0})
        if not other:
            continue
        last = await db.messages.find_one({"match_id": m["match_id"]}, {"_id": 0}, sort=[("at", -1)])
        out.append({"match_id": m["match_id"], "user": public_profile(other, u),
                    "last_message": last, "created_at": m["created_at"]})
    out.sort(key=lambda x: (x.get("last_message") or {}).get("at") or x["created_at"], reverse=True)
    return out


@api.delete("/matches/{match_id}")
async def unmatch(match_id: str, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    m = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not m or u["user_id"] not in m["users"]:
        raise HTTPException(404, "Match not found")
    # Remove the match + all chat history for both users.
    await db.matches.delete_one({"match_id": match_id})
    await db.messages.delete_many({"match_id": match_id})
    # Reset both users' likes so they don't auto re-match if they swipe again.
    await db.swipes.delete_many({"user_id": {"$in": m["users"]},
                                 "target_id": {"$in": m["users"]}})
    return {"ok": True}


# ---------- Test-Bot auto-reply ----------
# The bot profile itself is created on demand via POST /admin/create-test-bot
# (admin-key protected) rather than seeded automatically — there is no
# "instant match" shortcut endpoint; QA finds and swipes the bot through the
# normal discover/match flow like any other profile. Auto-reply keys off the
# matched profile's is_bot flag rather than a hardcoded id, so it keeps
# working regardless of which bot user_id is currently in use.
BOT_REPLIES = [
    "Hey! So excited we matched 🎉 I'm your test bot!",
    "Your profile looks amazing! I think we'd be great roommates 🏠",
    "I'm a huge coffee person too ☕ We'd get along perfectly!",
    "Have you checked out the neighborhood map? Indiranagar has everything nearby 🗺️",
    "Let's set up a time to see the place! It's fully furnished 🛋️",
    "Sounds great! When are you free to chat? 😊",
    "I think we'd be totally compatible! Check our lifestyle match 🌟",
]


# ---------- Messages ----------
@api.get("/messages/{match_id}")
async def get_messages(match_id: str, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    m = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not m or u["user_id"] not in m["users"]:
        raise HTTPException(404, "Match not found")
    msgs = await db.messages.find({"match_id": match_id}, {"_id": 0}).sort("at", 1).to_list(1000)
    return msgs


@api.post("/messages/{match_id}")
async def send_message(match_id: str, body: MessageIn, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    m = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not m or u["user_id"] not in m["users"]:
        raise HTTPException(404, "Match not found")
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Empty message")
    doc = {"id": str(uuid.uuid4()), "match_id": match_id, "sender_id": u["user_id"], "text": text, "at": now_iso()}
    await db.messages.insert_one(doc)
    doc.pop("_id", None)

    # Auto-reply if the other side of this match is a test bot.
    other_id = next((uid for uid in m["users"] if uid != u["user_id"]), None)
    other = await db.profiles.find_one({"user_id": other_id}, {"_id": 0, "is_bot": 1}) if other_id else None
    if other and other.get("is_bot"):
        reply_text = random.choice(BOT_REPLIES)
        reply_doc = {
            "id": str(uuid.uuid4()),
            "match_id": match_id,
            "sender_id": other_id,
            "text": reply_text,
            "at": now_iso(),
        }
        await db.messages.insert_one(reply_doc)
        await manager.broadcast(match_id, {"type": "message", "message": reply_doc})

    await manager.broadcast(match_id, {"type": "message", "message": doc}, exclude_user=u["user_id"])
    return doc


# ---------- Block / Report ----------
@api.post("/users/{user_id}/block")
async def block(user_id: str, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    await db.profiles.update_one({"user_id": u["user_id"]}, {"$addToSet": {"blocked": user_id}})
    return {"ok": True}


@api.post("/users/{user_id}/report")
async def report(user_id: str, authorization: Optional[str] = Header(None)):
    u = await get_user(authorization)
    await db.reports.insert_one({"id": str(uuid.uuid4()), "by": u["user_id"], "target": user_id, "at": now_iso()})
    return {"ok": True}


@api.post("/users/{user_id}/safety-report")
async def safety_report(user_id: str, body: SafetyReportIn, authorization: Optional[str] = Header(None)):
    """Structured safety report — stored in a dedicated collection for admin review."""
    u = await get_user(authorization)
    if user_id == u["user_id"]:
        raise HTTPException(400, "Cannot report yourself")
    doc = {
        "id": str(uuid.uuid4()),
        "reporter_id": u["user_id"],
        "reported_user_id": user_id,
        "reason": body.reason,
        "details": (body.details or "").strip() or None,
        "status": "pending",   # pending | reviewed | actioned | dismissed
        "at": now_iso(),
    }
    await db.safety_reports.insert_one(doc)
    # Also auto-block the reported user so they can't appear in discovery.
    await db.profiles.update_one(
        {"user_id": u["user_id"]},
        {"$addToSet": {"blocked": user_id}},
    )
    log.warning("Safety report filed: reporter=%s target=%s reason=%s", u["user_id"], user_id, body.reason)
    return {"ok": True, "report_id": doc["id"]}


class IDVerifyIn(BaseModel):
    image_base64: str  # data URI "data:image/jpeg;base64,..."

@api.post("/users/verify-id")
async def verify_id(body: IDVerifyIn, authorization: Optional[str] = Header(None)):
    """
    Accept an ID photo upload for manual review (no OCR, no admin UI —
    reviewed directly against the id_verifications collection). Image is
    stored only as a reference; it is NOT returned in any public API.
    """
    u = await get_user(authorization)
    uid = u["user_id"]

    # Basic size guard — base64 of ~5 MB image ≈ 7 MB string
    if len(body.image_base64) > 8_000_000:
        raise HTTPException(413, "Image too large. Max ~5 MB.")

    doc = {
        "user_id": uid,
        "image_base64": body.image_base64,   # encrypted at rest by MongoDB Atlas
        "submitted_at": now_iso(),
    }
    await db.id_verifications.insert_one(doc)

    log.info("ID verification submitted: user=%s", uid)
    return {"ok": True, "message": "Your ID has been submitted for review. Thanks!"}


# ---------- Admin: test-bot management (QA only) ----------
class CreateTestBotIn(BaseModel):
    user_id: str = "bot-test-new"
    name: str
    age: int
    gender: str
    bio: Optional[str] = None
    city: str = "Bangalore"
    state: str = "Karnataka"
    budget_min: int
    budget_max: Optional[int] = None
    listing_type: str = "looking"   # "has_place" | "looking"
    localities: List[str] = []
    lifestyle: Lifestyle = Field(default_factory=Lifestyle)


@api.post("/admin/create-test-bot")
async def create_test_bot(body: CreateTestBotIn, x_admin_key: Optional[str] = Header(None)):
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(403, "Invalid admin key")
    profile = Profile(
        user_id=body.user_id,
        email=f"{body.user_id}@livingcircle.app",
        name=body.name,
        age=body.age,
        gender=body.gender,
        photo=_placeholder("🤖", "#17A2B8"),
        bio=body.bio,
        occupation="professional",
        hometown=body.city,
        budget_min=body.budget_min,
        budget_max=body.budget_max or body.budget_min,
        localities=body.localities,
        move_in=datetime.now(timezone.utc).strftime("%Y-%m"),
        listing_type=body.listing_type,
        lifestyle=body.lifestyle,
        state=body.state,
        city=body.city,
        onboarded=True,
        can_login=False,
        is_bot=True,
    ).model_dump()
    await db.profiles.update_one({"user_id": body.user_id}, {"$set": profile}, upsert=True)
    log.info("Test bot created/updated: user_id=%s", body.user_id)
    return {"ok": True, "user_id": body.user_id, "profile": profile}


@api.delete("/admin/test-bot/{user_id}")
async def delete_test_bot(user_id: str, x_admin_key: Optional[str] = Header(None)):
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(403, "Invalid admin key")
    p = await db.profiles.find_one({"user_id": user_id}, {"_id": 0, "is_bot": 1})
    if not p or not p.get("is_bot"):
        raise HTTPException(404, "No test bot with that user_id")
    matches = await db.matches.find({"users": user_id}, {"_id": 0, "match_id": 1}).to_list(1000)
    match_ids = [m["match_id"] for m in matches]
    if match_ids:
        await db.messages.delete_many({"match_id": {"$in": match_ids}})
    await db.matches.delete_many({"users": user_id})
    await db.swipes.delete_many({"$or": [{"user_id": user_id}, {"target_id": user_id}]})
    await db.profiles.delete_many({"user_id": user_id})
    return {"ok": True, "deleted_user_id": user_id, "matches_deleted": len(match_ids)}


TEST_BOT_IDS = {"bot-test-001", "bot-test-new", "bot-test-002", "test-user", "alex-test"}
SEED_IDS = {"seed-1", "seed-2", "seed-3"}


def _is_test_like(p: dict) -> bool:
    """Heuristic used only for the pre-deletion preview breakdown — the actual
    wipe below is unconditional across every collection, not filtered by this."""
    if p.get("user_id") in TEST_BOT_IDS or p.get("user_id") in SEED_IDS:
        return True
    if p.get("is_bot"):
        return True
    name = (p.get("name") or "").lower()
    bio = (p.get("bio") or "").lower()
    if "(test bot)" in name or "(test)" in name:
        return True
    if "test" in bio or "bot" in bio:
        return True
    return False


class DeleteAllDataIn(BaseModel):
    confirm: bool = False


@api.post("/admin/delete-all-data")
async def delete_all_data(body: DeleteAllDataIn = DeleteAllDataIn(), x_admin_key: Optional[str] = Header(None)):
    """Full-database wipe (profiles, matches, messages, swipes, everything).
    Unconditional — call once without `confirm` for a dry-run preview of what
    exists, then again with {"confirm": true} to actually delete it all."""
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(403, "Invalid admin key")

    all_profiles = await db.profiles.find(
        {}, {"_id": 0, "user_id": 1, "name": 1, "bio": 1, "email": 1, "is_bot": 1}
    ).to_list(100_000)
    test_bots = [p["user_id"] for p in all_profiles if _is_test_like(p) and p["user_id"] not in SEED_IDS]
    seed_found = [p["user_id"] for p in all_profiles if p["user_id"] in SEED_IDS]
    collection_names = await db.list_collection_names()

    if not body.confirm:
        log.warning("ABOUT TO DELETE ALL DATA INCLUDING TEST BOTS")
        log.warning("This action cannot be undone!")
        log.warning("Test bots found: %s", test_bots)
        log.warning("Seed profiles found: %s", seed_found)
        return {
            "status": "preview",
            "message": 'Nothing deleted yet. Call again with {"confirm": true} to actually delete everything.',
            "would_delete": {
                "total_profiles": len(all_profiles),
                "test_bots": len(test_bots),
                "seed_profiles": len(seed_found),
                "matches": await db.matches.count_documents({}),
                "messages": await db.messages.count_documents({}),
                "swipes": await db.swipes.count_documents({}),
                "safety_reports": await db.safety_reports.count_documents({}),
                "collections": collection_names,
            },
            "test_bot_ids": test_bots,
            "seed_profile_ids": seed_found,
        }

    deleted: Dict[str, int] = {}
    for name in collection_names:
        res = await db[name].delete_many({})
        deleted[name] = res.deleted_count

    ts = now_iso()
    log.warning("Deleted all test bots")
    log.warning("Deleted all seed data")
    log.warning("Deleted all user data")
    log.warning("Database is now completely empty")
    log.warning("Timestamp: %s", ts)
    log.warning("Deleted counts: %s", deleted)

    return {
        "status": "success",
        "message": "All data deleted including test bots",
        "timestamp": ts,
        "deleted": {
            **deleted,
            "summary": {
                "total_profiles_deleted": len(all_profiles),
                "test_bots_deleted": len(test_bots),
                "seed_profiles_deleted": len(seed_found),
                "collections_cleared": len(collection_names),
            },
        },
    }


@api.get("/")
async def root():
    return {"app": "Living Circle", "ok": True, "email": EMAIL_ENABLED}


@api.get("/api/health")
async def health():
    return {"status": "ok", "app": "Living Circle API"}


# ---------- Seed ----------
SEED_NAMES = [
    ("Aarav Sharma", "male", "Hindi,English"),
    ("Priya Iyer", "female", "Tamil,English"),
    ("Rohan Mehta", "male", "Gujarati,Hindi,English"),
    ("Ananya Reddy", "female", "Telugu,English"),
    ("Vikram Singh", "male", "Punjabi,Hindi,English"),
    ("Sneha Patel", "female", "Gujarati,Hindi,English"),
    ("Karan Kapoor", "male", "Hindi,English"),
    ("Ishita Banerjee", "female", "Bengali,English,Hindi"),
    ("Rahul Verma", "male", "Hindi,English"),
    ("Meera Nair", "female", "Malayalam,English"),
    ("Aditya Joshi", "male", "Marathi,Hindi,English"),
    ("Pooja Agarwal", "female", "Hindi,English"),
    ("Siddharth Rao", "male", "Kannada,English"),
    ("Tanvi Desai", "female", "Gujarati,English"),
    ("Arjun Malhotra", "male", "Hindi,Punjabi,English"),
    ("Riya Choudhary", "female", "Hindi,English"),
    ("Nikhil Gupta", "male", "Hindi,English"),
    ("Divya Krishnan", "female", "Tamil,English,Hindi"),
]
FOODS = ["Veg", "Non-veg", "Eggetarian", "Jain", "Vegan"]
SLEEP = ["Early bird", "Night owl", "Flexible"]
CLEAN = ["Very tidy", "Average", "Relaxed"]
GUESTS = ["Often", "Sometimes", "Rarely"]
PETS = ["Have pets", "Open to pets", "No pets"]
YN = ["Yes", "No"]
RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other", SKIP]
WORK = ["9-5 (day shift)", "Night shift", "Flexible/WFH", "Irregular/varies"]
COOK = ["Daily", "Occasionally", "Rarely/order in", "Not at all"]
NOISE = ["Often", "With headphones only", "Rarely", "Depends on time of day"]
REL = ["Single", "In a relationship", "Married", SKIP]
OVN = ["Yes, anytime", "With notice", "Rarely", "No"]
SHARE = ["Yes, split everything", "Some items only", "Prefer separate", "Open to discuss"]
OCCS = ["student", "professional"]
ORGS_PROF = ["Infosys", "TCS", "Flipkart", "Swiggy", "Zomato", "Razorpay", "Microsoft", "Google"]
ORGS_STUD = ["IIT Bombay", "BITS Pilani", "Delhi University", "Christ University", "IIM Bangalore"]
AMENITIES_POOL = ["Lift", "Parking", "Power backup", "Water supply", "AC", "WiFi", "Washing machine"]
SEED_BIOS = [
    "Software engineer who loves weekend treks and filter coffee.",
    "PhD student. Big on yoga, indie music, and slow Sunday mornings.",
    "Product manager. Vegan cook, occasional gym-goer, plant parent.",
    "Designer & illustrator. Always down for a good book and chai.",
    "Final-year MBA. Cricket on weekends, biryani always.",
]
SEED_LISTING_DESCS = [
    "Sunny 2BHK with a balcony. Quiet building, RO water, daily housekeeping.",
    "Spacious furnished room available in a 3BHK. Working professionals only, lift, parking, gated society.",
    "Fully furnished PG with WiFi, AC, washing machine. Great food included.",
]


def _placeholder(label: str, color: str) -> str:
    """Inline SVG placeholder image (data URI) with the room label centered."""
    safe = label.replace("/", " ").replace("&", "and")
    svg = (
        f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>"
        f"<rect width='800' height='600' fill='{color}'/>"
        f"<text x='400' y='305' text-anchor='middle' fill='#FFFFFF' "
        f"font-family='Arial,sans-serif' font-size='48' font-weight='700'>{safe}</text>"
        f"</svg>"
    )
    import urllib.parse as _u
    return f"data:image/svg+xml;utf8,{_u.quote(svg)}"


async def seed_if_empty():
    # Always upsert so seed changes (e.g. new photos) are reflected on restart.
    fixtures = [
        # 1) Has-a-place professional in Bangalore — showcases listing photos + gallery.
        Profile(
            user_id="seed-1",
            email="seed1@example.com",
            name="Priya Iyer",
            age=27,
            gender="female",
            photo=_placeholder("PI", "#1E3A8A"),
            bio="Product designer at Google. Big on yoga, indie music, and slow Sunday mornings. Looking for a clean, easy-going roommate to share my 2BHK.",
            occupation="professional",
            org="Google",
            hometown="Bangalore",
            languages=["Tamil", "English", "Hindi"],
            budget_min=18000,
            budget_max=28000,
            localities=["Koramangala", "Indiranagar"],
            move_in="2026-09-01",
            listing_type="has_place",
            lifestyle=Lifestyle(
                food="Veg", smoking="No", drinking="No",
                sleep="Early bird", cleanliness="Very tidy",
                guests="Rarely", pets="No pets",
                religion="Hindu",
                work_timing="Flexible/WFH", cooking="Daily",
                noise="With headphones only",
                relationship_status="Single",
                overnight_guests="With notice",
                sharing_habits="Some items only",
            ),
            onboarded=True,
            can_login=False,
        ).model_dump(),

        # 2) Professional looking for a place in Bangalore.
        Profile(
            user_id="seed-2",
            email="seed2@example.com",
            name="Aarav Sharma",
            age=29,
            gender="male",
            photo=_placeholder("AS", "#1E3A8A"),
            bio="Software engineer at Razorpay. Weekend trekker, filter-coffee snob, and a reformed night owl trying to wake up by 7.",
            occupation="professional",
            org="Razorpay",
            hometown="Bangalore",
            languages=["Hindi", "English", "Kannada"],
            budget_min=20000,
            budget_max=35000,
            localities=["Whitefield", "Marathahalli"],
            move_in="2026-08-15",
            listing_type="looking",
            lifestyle=Lifestyle(
                food="Non-veg", smoking="No", drinking="Yes",
                sleep="Flexible", cleanliness="Average",
                guests="Sometimes", pets="Open to pets",
                religion="Hindu",
                work_timing="9-5 (day shift)", cooking="Occasionally",
                noise="Depends on time of day",
                relationship_status="Single",
                overnight_guests="With notice",
                sharing_habits="Open to discuss",
            ),
            onboarded=True,
            can_login=False,
        ).model_dump(),

        # 3) Student in Bangalore.
        Profile(
            user_id="seed-3",
            email="seed3@example.com",
            name="Meera Nair",
            age=23,
            gender="female",
            photo=_placeholder("MN", "#F97316"),
            bio="MBA student at IIM. Vegan cook, plant parent, and always down for a good book over chai. Looking for someone friendly, tidy, and low-drama.",
            occupation="student",
            org="IIM Bangalore",
            hometown="Bangalore",
            languages=["Malayalam", "English", "Hindi"],
            budget_min=12000,
            budget_max=18000,
            localities=["HSR Layout", "BTM Layout"],
            move_in="2026-07-10",
            listing_type="looking",
            lifestyle=Lifestyle(
                food="Vegan", smoking="No", drinking="No",
                sleep="Early bird", cleanliness="Very tidy",
                guests="Rarely", pets="Have pets",
                religion="Prefer not to say",
                work_timing="Irregular/varies", cooking="Daily",
                noise="With headphones only",
                relationship_status="Single",
                overnight_guests="No",
                sharing_habits="Yes, split everything",
            ),
            onboarded=True,
            can_login=False,
        ).model_dump(),
    ]

    for prof in fixtures:
        await db.profiles.update_one(
            {"user_id": prof["user_id"]}, {"$set": prof}, upsert=True
        )
    log.info("Seeded %d fixture profiles", len(fixtures))


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


# ---------- WebSocket chat ----------
# Single-process in-memory connection registry — fine for one Uvicorn worker;
# a multi-instance deployment would need Redis pub/sub to fan out across processes.
class ConnectionManager:
    def __init__(self) -> None:
        self.active: Dict[str, List[tuple]] = {}  # match_id -> [(user_id, websocket)]

    async def connect(self, match_id: str, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.active.setdefault(match_id, []).append((user_id, ws))

    def disconnect(self, match_id: str, ws: WebSocket) -> None:
        conns = self.active.get(match_id)
        if not conns:
            return
        self.active[match_id] = [(uid, w) for (uid, w) in conns if w is not ws]
        if not self.active[match_id]:
            del self.active[match_id]

    async def broadcast(self, match_id: str, payload: dict, exclude_user: Optional[str] = None) -> None:
        for uid, ws in list(self.active.get(match_id, [])):
            if uid == exclude_user:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(match_id, ws)


manager = ConnectionManager()


@app.websocket("/api/ws/chat/{match_id}")
async def ws_chat(websocket: WebSocket, match_id: str):
    token = websocket.query_params.get("token")
    try:
        u = await _load_user_by_token(token or "")
    except HTTPException:
        await websocket.close(code=4401)
        return

    m = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not m or u["user_id"] not in m["users"]:
        await websocket.close(code=4404)
        return

    await manager.connect(match_id, u["user_id"], websocket)
    try:
        while True:
            data = await websocket.receive_json()
            mtype = data.get("type")
            if mtype == "typing":
                await manager.broadcast(match_id, {"type": "typing", "user_id": u["user_id"]}, exclude_user=u["user_id"])
            elif mtype == "typing_stop":
                await manager.broadcast(match_id, {"type": "typing_stop", "user_id": u["user_id"]}, exclude_user=u["user_id"])
            elif mtype == "read":
                await manager.broadcast(
                    match_id,
                    {"type": "read", "user_id": u["user_id"], "message_id": data.get("message_id")},
                    exclude_user=u["user_id"],
                )
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(match_id, websocket)


@app.on_event("startup")
async def startup():
    await db.profiles.create_index("user_id", unique=True)
    await db.profiles.create_index("email", unique=True, sparse=True)
    await db.swipes.create_index([("user_id", 1), ("target_id", 1)], unique=True)
    await db.matches.create_index("match_id", unique=True)
    await db.messages.create_index([("match_id", 1), ("at", 1)])
    await db.otp_codes.create_index("email", unique=True)
    await db.otp_codes.create_index("expires_at", expireAfterSeconds=0)
    await db.safety_reports.create_index([("reported_user_id", 1), ("at", -1)])
    await db.safety_reports.create_index("reporter_id")
    await db.location_cache.create_index("key", unique=True)
    await db.location_cache.delete_many({})   # clear stale cache on restart
    await db.profiles.create_index("customer_id", sparse=True)
    await db.deleted_accounts.create_index("deleted_at", expireAfterSeconds=30 * 24 * 3600)
    await seed_if_empty()
    log.info("Backend ready. Email %s. Billing %s.",
              "ENABLED (Brevo)" if EMAIL_ENABLED else "DISABLED (dev mode)",
              "ENABLED (Stripe)" if BILLING_ENABLED else "DISABLED")
    # Verify weights sum to 100 (development invariant).
    s = sum(WEIGHTS.values())
    if s != 100:
        log.error("Compatibility WEIGHTS sum to %d, expected 100", s)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
