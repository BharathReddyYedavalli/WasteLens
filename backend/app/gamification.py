"""WasteLens scan XP, opt-in rankings and self-reported recycling activity.

Points reward successfully identified, distinct scans only. An action marked
recycled/reused is self-reported and is not evidence of environmental savings.
No photos, email addresses or precise locations appear in rankings.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

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
           (SELECT COALESCE(SUM(xp), 0) FROM scan_rewards WHERE user_id=?) +
           (SELECT COALESCE(SUM(xp), 0) FROM quiz_awards WHERE user_id=?) AS xp,
           (SELECT COUNT(*) FROM scan_actions WHERE user_id=?) AS actions,
           (SELECT COUNT(*) FROM quiz_awards WHERE user_id=?) AS quiz_badges""",
        (user_id, user_id, user_id, user_id, user_id, user_id),
    ).fetchone()
    return dict(counts)


@router.get("/leaderboard")
def leaderboard(request: Request):
    user = get_user(request)
    with database() as db:
        rows = db.execute(
            """SELECT u.id, u.name,
                      (SELECT COALESCE(SUM(xp),0) FROM scan_rewards WHERE user_id=u.id) +
                      (SELECT COALESCE(SUM(xp),0) FROM quiz_awards WHERE user_id=u.id) AS xp,
                      (SELECT COUNT(*) FROM scan_rewards WHERE user_id=u.id) AS rewarded_scans
               FROM users u WHERE u.role='user' AND u.leaderboard_visible=1
               ORDER BY xp DESC, rewarded_scans DESC, u.id ASC LIMIT 30"""
        ).fetchall()
        # Aggregate only self-reported actions, not independently verified recycling.
        published = []
        for rank, record in enumerate(rows, 1):
            stats = _user_stats(db, record["id"])
            published.append({
                "rank": rank, "name": record["name"], "xp": record["xp"],
                "level": 1 + record["xp"] // 100,
                "scans": stats["scans"], "actions": stats["actions"],
                "badges": sum(b["unlocked"] for b in _badges(record["rewarded_scans"])) + stats["quiz_badges"],
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
                "badges": _badges(stats["rewarded_scans"]) + [{
                    "id": "bottle-explorer",
                    "name": "Bottle Explorer",
                    "description": "Pass the bottle journey quiz",
                    "threshold": 0,
                    "unlocked": bool(stats["quiz_badges"]),
                }],
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


@router.get("/habits")
def personal_habits(request: Request):
    """Count scans and voluntarily logged outcomes without asserting diversion.

    No images, geolocation, weights or inferred emissions are used.
    """
    from datetime import datetime, timezone, timedelta

    user = require_user(request)
    today = datetime.now(timezone.utc).date()
    dates = [(today - timedelta(days=offset)).isoformat() for offset in range(6, -1, -1)]
    with database() as db:
        scan_rows = db.execute(
            "SELECT substr(created_at,1,10) AS day, COUNT(*) AS n FROM scans WHERE user_id=? "
            "AND created_at>=? GROUP BY substr(created_at,1,10)",
            (user["id"], dates[0]),
        ).fetchall()
        action_rows = db.execute(
            "SELECT substr(created_at,1,10) AS day, COUNT(*) AS n FROM scan_actions "
            "WHERE user_id=? AND created_at>=? GROUP BY substr(created_at,1,10)",
            (user["id"], dates[0]),
        ).fetchall()
        actions = db.execute(
            "SELECT action, COUNT(*) AS n FROM scan_actions WHERE user_id=? "
            "AND created_at>=? GROUP BY action",
            (user["id"], dates[0]),
        ).fetchall()
        totals = db.execute(
            "SELECT COUNT(*) FROM scans WHERE user_id=?", (user["id"],)
        ).fetchone()[0]
    scans_by_day = {row["day"]: row["n"] for row in scan_rows}
    actions_by_day = {row["day"]: row["n"] for row in action_rows}
    recorded = {row["action"]: row["n"] for row in actions}
    return {
        "days": [
            {"day": day, "scans": scans_by_day.get(day, 0),
             "actions": actions_by_day.get(day, 0)} for day in dates
        ],
        "seven_day_scans": sum(scans_by_day.values()),
        "seven_day_actions": sum(actions_by_day.values()),
        "total_scans": totals,
        "recorded_actions": recorded,
        "reuse_and_donation": recorded.get("reused", 0) + recorded.get("donated", 0),
        "verified_impact": False,
    }


QUIZ_ID = "bottle_journey_v1"
QUIZ_ANSWERS = ("ca10", "mi_no", "or_can", "hi_fee", "same_state")


class QuizSubmission(BaseModel):
    answers: list[str] = Field(min_length=5, max_length=5)


@router.get("/deposit/quiz/progress")
def bottle_quiz_progress(request: Request):
    user = get_user(request)
    if not user:
        return {"signed_in": False, "awarded": False, "xp": 0}
    with database() as db:
        row = db.execute("SELECT xp FROM quiz_awards WHERE user_id=?", (user["id"],)).fetchone()
    return {"signed_in": True, "awarded": bool(row), "xp": int(row["xp"]) if row else 0}


@router.post("/deposit/quiz/submit")
def submit_bottle_quiz(payload: QuizSubmission, request: Request):
    require_same_origin_action(request)
    score = sum(a == b for a, b in zip(payload.answers, QUIZ_ANSWERS))
    passed = score >= 4
    user = get_user(request)
    unlocked = False
    if passed and user:
        with database() as db:
            cursor = db.execute(
                """INSERT OR IGNORE INTO quiz_awards(user_id,quiz_id,xp,awarded_at)
                   VALUES (?,?,?,datetime('now'))""",
                (user["id"], QUIZ_ID, 30),
            )
            unlocked = cursor.rowcount == 1
    return {
        "score": score, "total": len(QUIZ_ANSWERS), "passed": passed,
        "earned_xp": 30 if unlocked else 0,
        "unlocked_badge": ({
            "id": "bottle-explorer", "name": "Bottle Explorer",
            "description": "Passed the bottle journey quiz", "unlocked": True,
            "threshold": 0
        } if unlocked else None),
        "signed_in": bool(user),
        "message": ("Badge earned!" if unlocked else
                    "Good job! Sign in to earn XP." if passed and not user else
                    "Quiz completed. Your reward was already collected." if passed else
                    "Almost there. Look back through the journey and try again."),
    }
