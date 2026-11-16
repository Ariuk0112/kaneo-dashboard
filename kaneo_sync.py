#!/usr/bin/env python3
"""Pull student requests from Kaneo and compute the numbers the
"Сургалтын албаны хүсэлтийн тойм" dashboard shows.

Usage:
    KANEO_API_TOKEN=... python3 kaneo_sync.py [--out data/dashboard.json] [--include-test]

The token is read from $KANEO_API_TOKEN or from .env.local next to this script.
Output: one JSON file with every widget's data, for each period (7 хоног / 1 сар / 6 сар).
"""
from __future__ import annotations

import argparse
import collections
import concurrent.futures as cf
import datetime as dt
import json
import os
import pathlib
import re
import urllib.request

BASE = os.environ.get("KANEO_API", "https://api.kaneo.ufe.edu.mn/api")
PROJECT_ID = os.environ.get("KANEO_PROJECT", "oon14b0oskd5nmec1ki0wvj5")  # "Requests" (REQ)
TZ = dt.timezone(dt.timedelta(hours=8))  # Ulaanbaatar

# Kaneo has no field that marks a request as handled by Azaa AI. List the
# Kaneo user ids that represent the AI here (e.g. a dedicated bot account);
# every other closer counts as "Ажилтан".
AI_USER_IDS: set[str] = set(filter(None, os.environ.get("KANEO_AI_USER_IDS", "").split(",")))

# Test submissions seen in the project (developer's own student code, pentest runs).
TEST_MARKERS = ("b24fm1195", "pentest", "tes test")

FINAL = {"done": "resolved", "rejected": "rejected"}
REJECT_COLOR = "red"  # red labels = rejection reasons; other labels = request type
PERIODS = {"7 хоног": 7, "1 сар": 30, "6 сар": 182}


def load_token() -> str:
    tok = os.environ.get("KANEO_API_TOKEN")
    env = pathlib.Path(__file__).with_name(".env.local")  # shared with the Next.js app
    if not tok and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("KANEO_API_TOKEN="):
                tok = line.split("=", 1)[1].strip()
    if not tok:
        raise SystemExit("Set KANEO_API_TOKEN (env or .env.local)")
    return tok


def api(path: str, token: str):
    req = urllib.request.Request(
        BASE + path, headers={"Authorization": f"Bearer {token}", "User-Agent": "kaneo-dashboard-sync"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def fetch_tasks(token: str) -> list[dict]:
    tasks: dict[str, dict] = {}
    page, pages = 1, 1
    while page <= pages:
        res = api(f"/task/tasks/{PROJECT_ID}?page={page}&limit=100", token)
        pages = res.get("pagination", {}).get("totalPages", 1)
        d = res["data"]
        for col in d["columns"]:
            for t in col["tasks"]:
                tasks[t["id"]] = t
        for key in ("plannedTasks", "archivedTasks"):
            for t in d.get(key) or []:
                tasks[t["id"]] = t
        page += 1
    return list(tasks.values())


def parse_ts(s: str | None) -> dt.datetime | None:
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(TZ) if s else None


def request_type(t: dict) -> str | None:
    m = re.search(r"\*\*Хүсэлтийн төрөл:\*\*\s*(.+)", t.get("description") or "")
    return m.group(1).strip() if m else None


def enrich(t: dict, activity: list[dict]) -> dict:
    closes = sorted(
        (a for a in activity if a["type"] == "status_changed" and a["eventData"].get("newStatus") in FINAL),
        key=lambda a: a["createdAt"],
    )
    last = closes[-1] if closes and t["status"] in FINAL else None
    created = parse_ts(t["createdAt"])
    closed = parse_ts(last["createdAt"]) if last else None
    due = parse_ts(t.get("dueDate"))
    labels = t.get("labels") or []
    return {
        "number": t["number"],
        "title": t["title"],
        "status": t["status"],
        "outcome": FINAL.get(t["status"], "open"),
        "type": request_type(t),
        "typeLabels": [l["name"] for l in labels if l.get("color") != REJECT_COLOR],
        "rejectReasons": [l["name"] for l in labels if l.get("color") == REJECT_COLOR],
        "created": created,
        "closed": closed,
        "due": due,
        "closedBy": last["userId"] if last else None,
        "handler": ("ai" if last and last["userId"] in AI_USER_IDS else "staff") if last else None,
        "overdue": bool(due and ((closed or dt.datetime.now(TZ)) > due)),
    }


def fmt_duration(hours: float | None) -> str | None:
    if hours is None:
        return None
    h, m = divmod(round(hours * 60), 60)
    return f"{h}ц {m}мин"


def summarize(reqs: list[dict], days: int, now: dt.datetime) -> dict:
    start = (now - dt.timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    rs = [r for r in reqs if r["created"] >= start]
    closed = [r for r in rs if r["closed"]]
    resolved = [r for r in rs if r["outcome"] == "resolved"]
    hours = [(r["closed"] - r["created"]).total_seconds() / 3600 for r in closed]

    # Weekly resolved, split staff / AI (Mon–Sun weeks, by close date)
    weeks: dict[dt.date, collections.Counter] = collections.OrderedDict()
    wk = start.date() - dt.timedelta(days=start.weekday())
    while wk <= now.date():
        weeks[wk] = collections.Counter()
        wk += dt.timedelta(days=7)
    for r in resolved:
        d = r["closed"].date()
        weeks.setdefault(d - dt.timedelta(days=d.weekday()), collections.Counter())[r["handler"]] += 1

    # Daily: [arrived, resolved by staff, resolved by AI]
    daily = collections.defaultdict(lambda: [0, 0, 0])
    for r in rs:
        daily[r["created"].date().isoformat()][0] += 1
    for r in resolved:
        daily[r["closed"].date().isoformat()][1 if r["handler"] == "staff" else 2] += 1

    top = lambda c, n=5: [{"label": k, "value": v} for k, v in c.most_common(n)]
    return {
        "from": start.date().isoformat(),
        "kpi": {
            "total": len(rs),
            "resolved": len(resolved),
            "rejected": sum(r["outcome"] == "rejected" for r in rs),
            "open": sum(r["outcome"] == "open" for r in rs),
            "overdue": sum(r["overdue"] for r in rs),
            "avgHours": round(sum(hours) / len(hours), 2) if hours else None,
            "avgLabel": fmt_duration(sum(hours) / len(hours)) if hours else None,
        },
        "weekly": [
            {
                "week": f"{w:%m/%d}–{w + dt.timedelta(days=6):%m/%d}",
                "ajiltan": c["staff"],
                "azaaAi": c["ai"],
            }
            for w, c in weeks.items()
        ],
        "daily": dict(sorted(daily.items())),
        "topTypes": top(collections.Counter(r["type"] or "Тодорхойгүй" for r in rs)),
        "rejectReasons": top(collections.Counter(x for r in rs for x in r["rejectReasons"])),
        "overdueTypes": top(collections.Counter(r["type"] or "Тодорхойгүй" for r in rs if r["overdue"])),
        "byStatus": dict(collections.Counter(r["status"] for r in rs)),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/dashboard.json")
    ap.add_argument("--include-test", action="store_true", help="keep test submissions")
    args = ap.parse_args()

    token = load_token()
    tasks = fetch_tasks(token)
    with cf.ThreadPoolExecutor(8) as ex:
        acts = dict(zip((t["id"] for t in tasks), ex.map(lambda t: api(f"/activity/{t['id']}", token), tasks)))

    reqs = []
    for t in tasks:
        if t["status"] == "archived":
            continue
        if request_type(t) is None:  # internal tasks, not student requests
            continue
        blob = ((t.get("description") or "") + t["title"]).lower()
        if not args.include_test and any(m in blob for m in TEST_MARKERS):
            continue
        reqs.append(enrich(t, acts[t["id"]]))

    now = dt.datetime.now(TZ)
    today = now.date()
    td = [r for r in reqs if r["created"].date() == today]
    tc = [r for r in reqs if r["outcome"] == "resolved" and r["closed"].date() == today]
    out = {
        "generatedAt": now.isoformat(timespec="seconds"),
        "source": {"api": BASE, "projectId": PROJECT_ID, "tasksFetched": len(tasks), "requestsUsed": len(reqs)},
        "today": {
            "date": today.isoformat(),
            "arrived": len(td),
            "resolvedStaff": sum(r["handler"] == "staff" for r in tc),
            "resolvedAi": sum(r["handler"] == "ai" for r in tc),
        },
        "periods": {name: summarize(reqs, days, now) for name, days in PERIODS.items()},
    }
    p = pathlib.Path(args.out)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"wrote {p} — {len(reqs)} requests ({len(tasks)} tasks fetched)")


if __name__ == "__main__":
    main()
