"""Living Circle — Roommate finder backend.

FastAPI + MongoDB. Passwordless email auth (6-digit code → JWT).
Photos as base64. All routes prefixed with /api.
"""
from __future__ import annotations

import logging
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
from fastapi import APIRouter, FastAPI, Header, HTTPException
from jwt import ExpiredSignatureError, InvalidTokenError
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
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
SKIP = "Prefer not to say"


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


class ListingPhoto(BaseModel):
    label: str
    photo: str  # base64 (data URI or raw)


class Listing(BaseModel):
    rent: Optional[int] = None
    deposit: Optional[int] = None
    maintenance: Optional[int] = None
    furnished: Optional[str] = None
    amenities: List[str] = []
    property_type: Optional[str] = None
    posted_by: Optional[str] = None
    photos: List[ListingPhoto] = []
    description: Optional[str] = None


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
    listing: Listing = Field(default_factory=Listing)
    onboarded: bool = False
    can_login: bool = True
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
    listing: Optional[Listing] = None
    onboarded: Optional[bool] = None


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
async def get_user(token: Optional[str]) -> dict:
    if not token:
        raise HTTPException(401, "Missing auth token")
    raw = token.strip()
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
    return round((score / total) * 100)


def shared_prefs(a: dict, b: dict) -> List[str]:
    la = a.get("lifestyle") or {}
    lb = b.get("lifestyle") or {}
    out: List[str] = []
    for k, lbl in LABELS.items():
        va, vb = la.get(k), lb.get(k)
        if _eligible(k, va, vb) and va == vb:
            out.append(f"Same {lbl}: {va}")
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
        "hometown": p.get("hometown"),
        "languages": p.get("languages", []),
        "budget_min": p.get("budget_min"),
        "budget_max": p.get("budget_max"),
        "localities": p.get("localities", []),
        "move_in": p.get("move_in"),
        "listing_type": p.get("listing_type"),
        "lifestyle": p.get("lifestyle", {}),
        "listing": p.get("listing", {}),
    }
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
    if "listing" in updates and isinstance(updates["listing"], dict):
        merged = {**(u.get("listing") or {}), **updates["listing"]}
        updates["listing"] = merged
    await db.profiles.update_one({"user_id": u["user_id"]}, {"$set": updates})
    out = await db.profiles.find_one({"user_id": u["user_id"]}, {"_id": 0})
    return out


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
        "hometown": "Bangalore",
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
        "Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "BTM Layout",
        "Marathahalli", "Jayanagar", "Electronic City", "Viman Nagar", "Sarjapur Road",
    ],
}
CITIES = ["Bangalore"]


@api.get("/meta/cities")
async def get_cities():
    return {"cities": CITIES, "localities": CITY_LOCALITIES}


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
    if body.direction == "like":
        reverse = await db.swipes.find_one(
            {"user_id": body.target_id, "target_id": u["user_id"], "direction": "like"},
            {"_id": 0},
        )
        if reverse:
            key = sorted([u["user_id"], body.target_id])
            match_id = f"{key[0]}__{key[1]}"
            existing = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
            if not existing:
                await db.matches.insert_one({"match_id": match_id, "users": key, "created_at": now_iso()})
            match = {"match_id": match_id, "user": public_profile(target, u)}
    return {"ok": True, "match": match}


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
            listing=Listing(
                rent=28000, deposit=56000, maintenance=2000,
                furnished="Semi-furnished",
                amenities=["Lift", "Parking", "Power backup", "Water supply", "WiFi", "Washing machine"],
                property_type="Independent",
                posted_by="Tenant",
                photos=[
                    ListingPhoto(label="Kitchen", photo=_placeholder("Kitchen", "#F26D5B")),
                    ListingPhoto(label="Bedroom/Room", photo=_placeholder("Bedroom", "#1E3A8A")),
                    ListingPhoto(label="Bathroom", photo=_placeholder("Bathroom", "#0891B2")),
                    ListingPhoto(label="Hall/Living area", photo=_placeholder("Hall", "#9C6644")),
                ],
                description="Sunny 2BHK on the 4th floor with a balcony. Quiet building, RO water, daily housekeeping, walking distance to Sony World junction.",
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
            listing=Listing(),
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
            listing=Listing(),
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
    await seed_if_empty()
    log.info("Backend ready. Email %s.", "ENABLED (Brevo)" if EMAIL_ENABLED else "DISABLED (dev mode)")
    # Verify weights sum to 100 (development invariant).
    s = sum(WEIGHTS.values())
    if s != 100:
        log.error("Compatibility WEIGHTS sum to %d, expected 100", s)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
