"""Seed preset Mandiri branch location (KC Jakarta Wisma Danantara)."""
from sqlmodel import Session, select
from app.models import BranchPreset

BRANCH_PRESETS = [
    {
        "name": "Bank Mandiri KC Jakarta Wisma Danantara",
        "code": "JKT-DANANTARA",
        "latitude": -6.2249,
        "longitude": 106.8145,
        "city": "Jakarta Selatan",
    },
]


def seed_branches(session: Session) -> None:
    existing = session.exec(select(BranchPreset)).all()
    if len(existing) == 1 and existing[0].code == "JKT-DANANTARA":
        return
    for b in existing:
        session.delete(b)
    for b in BRANCH_PRESETS:
        session.add(BranchPreset(**b))
    session.commit()
