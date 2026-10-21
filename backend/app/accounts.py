"""WasteLens accounts, private scan history, classification feedback and admin read views.

SQLite works without a hosted database for the local prototype. Photo bytes and
passwords are never saved: scan history contains analysis text only. Sessions
are opaque, HttpOnly, hashed server-side and scoped to the issuing account.
"""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import time
import warnings

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[2]
router = APIRouter(prefix="/api")
hasher = PasswordHasher()
COOKIE = "wastelens_session"
SESSION_SECONDS = 7 * 24 * 60 * 60
_init_lock = threading.Lock()
_initialized: set[str] = set()

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    analysis_json TEXT NOT NULL,
    zip_code TEXT,
    feedback TEXT CHECK(feedback IN ('yes','no') OR feedback IS NULL),
    correction TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_index ON sessions(user_id);
CREATE INDEX IF NOT EXISTS scans_user_index ON scans(user_id,id DESC);
CREATE TABLE IF NOT EXISTS scan_rewards (
    scan_id INTEGER PRIMARY KEY REFERENCES scans(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_hash TEXT NOT NULL,
    xp INTEGER NOT NULL CHECK(xp > 0),
    created_at TEXT NOT NULL,
    UNIQUE (user_id, photo_hash)
);
CREATE INDEX IF NOT EXISTS scan_rewards_user_index ON scan_rewards(user_id,created_at);
CREATE TABLE IF NOT EXISTS scan_actions (
    scan_id INTEGER PRIMARY KEY REFERENCES scans(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('recycled','reused','composted','donated')),
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS scan_actions_user_index ON scan_actions(user_id);
CREATE TABLE IF NOT EXISTS community_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    entries_json TEXT NOT NULL,
    counts_json TEXT NOT NULL,
    item_count INTEGER NOT NULL CHECK(item_count BETWEEN 1 AND 15000),
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS community_audits_user_index ON community_audits(user_id,id DESC);
CREATE TABLE IF NOT EXISTS quiz_awards (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL CHECK(quiz_id='bottle_journey_v1'),
    xp INTEGER NOT NULL CHECK(xp=30),
    awarded_at TEXT NOT NULL
);
"""


def db_path() -> Path:
    return Path(os.environ.get("WASTELENS_DB", str(ROOT / "backend" / "data" / "wastelens.sqlite3"))).expanduser().resolve()


def initialize():
    """Safe on repeated calls, including when used outside a lifespan-managed server."""
    path = db_path()
    key = str(path)
    with _init_lock:
        if key in _initialized:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(path, timeout=15)
        try:
            connection.execute("PRAGMA foreign_keys=ON")
            connection.executescript(SCHEMA)
            # Add new opt-in setting to existing user databases without deleting accounts.
            columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
            if "leaderboard_visible" not in columns:
                connection.execute(
                    "ALTER TABLE users ADD COLUMN leaderboard_visible INTEGER NOT NULL DEFAULT 0"
                )
            connection.commit()
        finally:
            connection.close()
        _initialized.add(key)


@contextmanager
def database():
    initialize()
    conn = sqlite3.connect(db_path(), timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def token_hash(token: str):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_user(request: Request):
    token = request.cookies.get(COOKIE, "")
    if not token or len(token) > 160:
        return None
    with database() as db:
        result = db.execute(
            """SELECT users.id, users.name, users.email, users.role
               FROM sessions JOIN users ON sessions.user_id = users.id
               WHERE sessions.token_hash=? AND sessions.expires_at>?""",
            (token_hash(token), int(time.time())),
        ).fetchone()
    return dict(result) if result else None


def require_user(request: Request):
    user = get_user(request)
    if not user:
        raise HTTPException(401, "Sign in to use this feature.")
    return user


def require_admin(request: Request):
    user = require_user(request)
    if user["role"] != "admin":
        raise HTTPException(403, "Administrator access required.")
    return user


def require_same_origin_action(request: Request):
    # A custom header requires a browser CORS preflight from any foreign origin.
    # We do not enable cross-origin requests on this backend.
    if request.headers.get("x-wastelens-request") != "1":
        raise HTTPException(403, "Missing same-origin request header.")


def _set_cookie(response: Response, request: Request, token: str):
    secure = request.url.scheme == "https" or os.environ.get("WASTELENS_COOKIE_SECURE") == "1"
    response.set_cookie(
        COOKIE, token, max_age=SESSION_SECONDS, httponly=True,
        secure=secure, samesite="lax", path="/",
    )


def _create_session(db, user_id):
    raw = secrets.token_urlsafe(32)
    db.execute(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
        (token_hash(raw), user_id, int(time.time()) + SESSION_SECONDS),
    )
    return raw


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)
    name: str = Field(default="", max_length=80)


def normalized_email(raw: str):
    value = raw.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise HTTPException(422, "Enter a valid email address.")
    return value


@router.post("/auth/signup")
def signup(details: Credentials, request: Request, response: Response):
    require_same_origin_action(request)
    email = normalized_email(details.email)
    name = details.name.strip()
    if len(name) < 2:
        raise HTTPException(422, "Your display name must be at least 2 characters.")
    if len(details.password) < 10:
        raise HTTPException(422, "Use a password of at least 10 characters.")
    with database() as db:
        try:
            row = db.execute(
                "INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,'user',?)",
                (name, email, hasher.hash(details.password), now_iso()),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "An account with that email already exists.")
        token = _create_session(db, row.lastrowid)
        user_id = row.lastrowid
    _set_cookie(response, request, token)
    return {"id": user_id, "name": name, "email": email, "role": "user"}


@router.post("/auth/login")
def login(details: Credentials, request: Request, response: Response):
    require_same_origin_action(request)
    email = normalized_email(details.email)
    with database() as db:
        row = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        try:
            valid = bool(row) and hasher.verify(row["password_hash"], details.password)
        except (VerificationError, InvalidHashError):
            valid = False
        if not valid:
            raise HTTPException(401, "Incorrect email or password.")
        token = _create_session(db, row["id"])
    _set_cookie(response, request, token)
    return {key: row[key] for key in ("id", "name", "email", "role")}


@router.post("/auth/logout")
def logout(request: Request, response: Response):
    require_same_origin_action(request)
    token = request.cookies.get(COOKIE)
    if token:
        with database() as db:
            db.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash(token),))
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/auth/me")
def me(request: Request):
    return {"user": get_user(request)}


def record_scan(
    user_id: int, model_id: str, analysis: dict, zip_code: str | None = None,
    photo_digest: str | None = None,
):
    """Save text only. Award at most 10 distinct, confidently identified scans daily.

    Photo SHA256 is scoped to the user ID, not shared between accounts.
    Identical image re-uploads and uncertain identifications earn no further XP.
    The photo itself is never saved.
    """
    with database() as db:
        created_at = now_iso()
        cursor = db.execute(
            """INSERT INTO scans(user_id,item_name,model_id,analysis_json,zip_code,created_at)
               VALUES(?,?,?,?,?,?)""",
            (user_id, analysis["item_name"], model_id,
             json.dumps(analysis), zip_code, created_at),
        )
        scan_id = cursor.lastrowid
        if photo_digest and analysis.get("identification") == "likely":
            awarded_today = db.execute(
                """SELECT COUNT(*) FROM scan_rewards
                   WHERE user_id=? AND created_at>=?""",
                (user_id, created_at[:10] + "T00:00:00"),
            ).fetchone()[0]
            if awarded_today < 10:
                try:
                    db.execute(
                        """INSERT INTO scan_rewards(scan_id,user_id,photo_hash,xp,created_at)
                           VALUES (?,?,?,?,?)""",
                        (scan_id, user_id, photo_digest, 20, created_at),
                    )
                except sqlite3.IntegrityError:
                    # Reusing the same image does not award additional points.
                    pass
        return scan_id


@router.get("/scans")
def my_scans(request: Request):
    user = require_user(request)
    with database() as db:
        records = db.execute(
            """SELECT id,item_name,model_id,analysis_json,zip_code,feedback,correction,created_at
               FROM scans WHERE user_id=? ORDER BY id DESC LIMIT 200""",
            (user["id"],),
        ).fetchall()
    return {"scans": [
        {**{k: r[k] for k in ("id","item_name","model_id","zip_code","feedback","correction","created_at")},
         "analysis": json.loads(r["analysis_json"])} for r in records
    ]}


class Feedback(BaseModel):
    correct: bool
    correction: str = Field(default="", max_length=160)


@router.post("/scans/{scan_id}/feedback")
def give_feedback(scan_id: int, payload: Feedback, request: Request):
    require_same_origin_action(request)
    user = require_user(request)
    with database() as db:
        cursor = db.execute(
            """UPDATE scans SET feedback=?, correction=? WHERE id=? AND user_id=?""",
            ("yes" if payload.correct else "no",
             "" if payload.correct else payload.correction.strip(), scan_id, user["id"]),
        )
        if cursor.rowcount == 0:
            raise HTTPException(404, "Scan not found in your account.")
    return {"scan_id": scan_id, "feedback": "yes" if payload.correct else "no"}


@router.get("/admin/overview")
def admin_overview(request: Request):
    require_admin(request)
    with database() as db:
        users = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        scans = db.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
        yes = db.execute("SELECT COUNT(*) FROM scans WHERE feedback='yes'").fetchone()[0]
        no = db.execute("SELECT COUNT(*) FROM scans WHERE feedback='no'").fetchone()[0]
    return {"users": users, "scans": scans, "yes": yes, "no": no}


@router.get("/admin/users")
def admin_users(request: Request):
    require_admin(request)
    with database() as db:
        rows = db.execute(
            """SELECT u.id,u.name,u.email,u.role,u.created_at, COUNT(s.id) AS scan_count
               FROM users u LEFT JOIN scans s ON s.user_id=u.id
               GROUP BY u.id ORDER BY u.id DESC LIMIT 500"""
        ).fetchall()
    return {"users": [dict(row) for row in rows]}


@router.get("/admin/feedback")
def admin_feedback(request: Request):
    require_admin(request)
    with database() as db:
        rows = db.execute(
            """SELECT s.id,s.item_name,s.feedback,s.correction,s.created_at,
                      u.id AS user_id,u.name AS user_name,u.email AS user_email
               FROM scans s JOIN users u ON s.user_id=u.id
               WHERE s.feedback IS NOT NULL ORDER BY s.id DESC LIMIT 500"""
        ).fetchall()
    return {"feedback": [dict(row) for row in rows]}


def bootstrap_admin():
    """Explicit admin bootstrap only; public signups never grant admin privileges."""
    email_raw = os.environ.get("WASTELENS_ADMIN_EMAIL", "").strip()
    password = os.environ.get("WASTELENS_ADMIN_PASSWORD", "")
    if not email_raw and not password:
        return
    if not email_raw or len(password) < 12:
        warnings.warn(
            "Incomplete admin configuration: set WASTELENS_ADMIN_EMAIL and "
            "a 12+ character WASTELENS_ADMIN_PASSWORD. Admin creation is skipped "
            "so the other WasteLens features can still run.",
            RuntimeWarning, stacklevel=2,
        )
        return
    email = normalized_email(email_raw)
    with database() as db:
        existing = db.execute("SELECT id,role FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            if existing["role"] != "admin":
                raise RuntimeError("Admin email already belongs to a non-admin account.")
            return
        db.execute(
            "INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,'admin',?)",
            ("Administrator", email, hasher.hash(password), now_iso()),
        )
