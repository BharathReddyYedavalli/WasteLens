"""WasteLens scan XP, opt-in rankings and self-reported recycling activity.

Points reward successfully identified, distinct scans only. An action marked
recycled/reused is self-reported and is not evidence of environmental savings.
No photos, email addresses or precise locations appear in rankings.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .accounts import database, get_user, require_same_origin_action, require_user

router = APIRouter(prefix="/api")

BADGES = (
    (1, "First Find", "Scan your first item", "sprout"),
    (5, "Getting Curious", "Earn XP from five scans", "search"),
    (10, "Sorting Star", "Earn XP from ten scans", "star"),
    (25, "Everyday Hero", "Earn XP from 25 scans", "leaf"),
    (50, "Waste Wise", "Earn XP from 50 scans", "trophy"),
)
XP_PER_SCAN = 20
DAILY_LIMIT = 10


class VisibilityRequest(BaseModel):
    visible: bool


class ActionRequest(BaseModel):
    action: str


def _badges(rewarded: int):
    return [
        {
            "id": symbol,
            "name": name,
            "description": description,
            "threshold": count,
            "unlocked": rewarded >= count,
        }
        for count, name, description, symbol in BADGES
    ]


def _user_stats(db, user_id: int):
    counts = db.execute(
        """SELECT
           (SELECT COUNT(*) FROM scans WHERE user_id=?) AS scans,
           (SELECT COUNT(*) FROM scan_rewards WHERE user_id=?) AS rewarded_scans,
           (SELECT COALESCE(SUM(xp), 0) FROM scan_rewards WHERE user_id=?) AS xp,
           (SELECT COUNT(*) FROM scan_actions WHERE user_id=?) AS actions""",
        (user_id, user_id, user_id, user_id),
    ).fetchone()
    return dict(counts)


@router.get("/leaderboard")
def leaderboard(request: Request):
    user = get_user(request)
    with database() as db:
        rows = db.execute(
            """SELECT u.id, u.name, COALESCE(SUM(r.xp),0) AS xp,
                      COUNT(r.scan_id) AS rewarded_scans
               FROM users u LEFT JOIN scan_rewards r ON r.user_id=u.id
               WHERE u.role='user' AND u.leaderboard_visible=1
               GROUP BY u.id ORDER BY xp DESC, rewarded_scans DESC, u.id ASC LIMIT 30"""
        ).fetchall()
        # Aggregate only self-reported actions, not independently verified recycling.
        published = []
        for rank, record in enumerate(rows, 1):
            stats = _user_stats(db, record["id"])
            published.append({
                "rank": rank, "name": record["name"], "xp": record["xp"],
                "level": 1 + record["xp"] // 100,
                "scans": stats["scans"], "actions": stats["actions"],
                "badges": sum(b["unlocked"] for b in _badges(record["rewarded_scans"])),
                "is_you": bool(user and record["id"] == user["id"]),
            })
        me = None
        if user:
            stats = _user_stats(db, user["id"])
            setting = db.execute(
                "SELECT leaderboard_visible FROM users WHERE id=?", (user["id"],)
            ).fetchone()
            xp = stats["xp"]
            me = {
                **stats, "level": 1 + xp // 100, "level_progress": xp % 100,
                "level_goal": 100,
                "visible": bool(setting["leaderboard_visible"]),
                "badges": _badges(stats["rewarded_scans"]),
                "carbon_kg": None,
            }
    return {
        "leaders": published,
        "me": me,
        "rules": {
            "xp_per_scan": XP_PER_SCAN, "daily_limit": DAILY_LIMIT,
            "note": "Points are for valid distinct scans, not proof of recycling. Actions are self-reported.",
        },
    }


@router.post("/leaderboard/visibility")
def set_visibility(payload: VisibilityRequest, request: Request):
    require_same_origin_action(request)
    user = require_user(request)
    with database() as db:
        db.execute(
            "UPDATE users SET leaderboard_visible=? WHERE id=?",
            (1 if payload.visible else 0, user["id"]),
        )
    return {"visible": payload.visible}


@router.post("/scans/{scan_id}/action")
def report_action(scan_id: int, payload: ActionRequest, request: Request):
    require_same_origin_action(request)
    user = require_user(request)
    if payload.action not in {"recycled", "reused", "composted", "donated"}:
        raise HTTPException(422, "Choose recycled, reused, composted or donated.")
    with database() as db:
        scan = db.execute(
            "SELECT id FROM scans WHERE id=? AND user_id=?", (scan_id, user["id"])
        ).fetchone()
        if not scan:
            raise HTTPException(404, "Scan not found in your account.")
        db.execute(
            """INSERT INTO scan_actions (scan_id,user_id,action,created_at)
               VALUES (?,?,?,datetime('now'))
               ON CONFLICT(scan_id) DO UPDATE SET action=excluded.action,
                                                  created_at=excluded.created_at""",
            (scan_id, user["id"], payload.action),
        )
    return {"scan_id": scan_id, "action": payload.action, "self_reported": True}


def xp_for_scan(scan_id: int) -> int:
    with database() as db:
        reward = db.execute("SELECT xp FROM scan_rewards WHERE scan_id=?", (scan_id,)).fetchone()
    return int(reward["xp"]) if reward else 0



def new_badges_for_scan(scan_id: int) -> list[dict]:
    """Only the scan which crosses an award threshold returns a new badge.

    This derives unlocks from the saved reward row, so a repeated image,
    uncertain scan, or a reload cannot trigger a second celebration.
    """
    with database() as db:
        reward = db.execute(
            "SELECT user_id FROM scan_rewards WHERE scan_id=?", (scan_id,)
        ).fetchone()
        if not reward:
            return []
        rewarded_count = db.execute(
            """SELECT COUNT(*) FROM scan_rewards
               WHERE user_id=? AND scan_id<=?""",
            (reward["user_id"], scan_id),
        ).fetchone()[0]
    return [
        badge for badge in _badges(rewarded_count)
        if badge["threshold"] == rewarded_count and badge["unlocked"]
    ]
