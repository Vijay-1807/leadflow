"""Seed LeadFlow with realistic demo data — 7 leads + discussions.

Run:  python seed.py
"""
from datetime import datetime, timedelta

from database import Base, SessionLocal, engine
from models import Discussion, Lead

NOW = datetime.now()


def hours_ago(h: int) -> datetime:
    return NOW - timedelta(hours=h)


def days_ago(d: int, hour: int = 10, minute: int = 30) -> datetime:
    base = (NOW - timedelta(days=d)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base


def today_at(hour: int, minute: int = 0) -> datetime:
    return NOW.replace(hour=hour, minute=minute, second=0, microsecond=0)


SEED = [
    {
        "name": "Sarah Connor",
        "company": "Acme Corp",
        "phone": "555-0199",
        "status": "Proposal Sent",
        "follow_up_at": today_at(14, 0),
        "discussions": [
            ("Sent pricing tier PDF. Said she would review with her boss. Follow-up set for today 2 PM.", hours_ago(49), today_at(14, 0)),
            ("Initial discovery call. They need a CRM for 50 reps. Pain points include dropping leads and no follow-up tracking.", days_ago(5, 9, 0), None),
            ("Lead created via web form.", days_ago(6, 16, 0), None),
        ],
    },
    {
        "name": "Hank Scorpio",
        "company": "Globex",
        "phone": "555-0142",
        "status": "New",
        "follow_up_at": None,
        "discussions": [
            ("Inbound lead from website contact form. Interested in wealth-advisory pilot.", hours_ago(2), None),
            ("Lead created via web form.", hours_ago(3), None),
        ],
    },
    {
        "name": "Bill Lumbergh",
        "company": "Initech",
        "phone": "555-0117",
        "status": "Contacted",
        "follow_up_at": today_at(17, 30),
        "discussions": [
            ("Left a voicemail with his assistant. He asked for a callback after 5 PM today.", days_ago(7, 11, 15), today_at(17, 30)),
            ("Intro email sent with one-pager on advisor personalization.", days_ago(8, 10, 0), None),
        ],
    },
    {
        "name": "Bruce Wayne",
        "company": "Wayne Enterprises",
        "phone": "555-0100",
        "status": "Won",
        "follow_up_at": None,
        "discussions": [
            ("Contract signed! Sending welcome package and onboarding checklist.", days_ago(21, 15, 45), None),
            ("Negotiation closed at 12% discount on annual plan for 200 seats.", days_ago(23, 12, 0), None),
            ("Demo went great — loved the follow-up reminders and timeline view.", days_ago(26, 14, 30), None),
        ],
    },
    {
        "name": "Ananya Sharma",
        "company": "Zerodha Advisory",
        "phone": "+91 98200 12345",
        "status": "Qualified",
        "follow_up_at": NOW - timedelta(days=1, hours=2),  # overdue
        "discussions": [
            ("Qualified! Manages 120 HNI clients. Wants personalized nudges at scale. Missed yesterday's follow-up — call back ASAP.", days_ago(2, 12, 20), NOW - timedelta(days=1, hours=2)),
            ("Discovery call: uses spreadsheets today, losing track of renewals.", days_ago(4, 11, 0), None),
        ],
    },
    {
        "name": "Rohan Mehta",
        "company": "HDFC Wealth",
        "phone": "+91 99301 44556",
        "status": "Contacted",
        "follow_up_at": NOW - timedelta(days=2),  # overdue
        "discussions": [
            ("Asked for compliance/security docs before pilot. Overdue — send docs + chase.", days_ago(3, 16, 10), NOW - timedelta(days=2)),
            ("First call done. Very interested in AI-smart notes.", days_ago(5, 10, 30), None),
        ],
    },
    {
        "name": "Priya Nair",
        "company": "FinEdge",
        "phone": "+91 97420 88990",
        "status": "Lost",
        "follow_up_at": None,
        "discussions": [
            ("Lost — went with an incumbent. Revisit in Q2 with new pricing.", days_ago(10, 13, 0), None),
            ("Proposal sent for 25 seats.", days_ago(14, 10, 0), None),
        ],
    },
]


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Lead).count()
        if existing > 0:
            print(f"DB already has {existing} leads — clearing and re-seeding...")
            db.query(Discussion).delete()
            db.query(Lead).delete()
            db.commit()
        for item in SEED:
            lead = Lead(
                name=item["name"],
                company=item["company"],
                phone=item["phone"],
                status=item["status"],
                follow_up_at=item["follow_up_at"],
            )
            db.add(lead)
            db.flush()
            for note, created_at, fup in item["discussions"]:
                db.add(Discussion(lead_id=lead.id, note=note, created_at=created_at, follow_up_at=fup))
            db.commit()
        print(f"Seeded {len(SEED)} leads with discussions. Today: {NOW.date()}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
