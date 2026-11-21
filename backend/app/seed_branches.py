"""Seed preset Mandiri branch locations."""
from sqlmodel import Session, select
from app.models import BranchPreset

BRANCH_PRESETS = [
    {"name": "KC Jakarta Thamrin", "code": "JKT-THR", "latitude": -6.1930, "longitude": 106.8237, "city": "Jakarta"},
    {"name": "KC Tangerang", "code": "TGR", "latitude": -6.1783, "longitude": 106.6319, "city": "Tangerang"},
    {"name": "KC Bogor", "code": "BGR", "latitude": -6.5971, "longitude": 106.8060, "city": "Bogor"},
    {"name": "KC Depok", "code": "DPK", "latitude": -6.4025, "longitude": 106.7942, "city": "Depok"},
    {"name": "KC Bekasi", "code": "BKS", "latitude": -6.2383, "longitude": 106.9756, "city": "Bekasi"},
    {"name": "KCP Cikarang", "code": "CKR", "latitude": -6.2615, "longitude": 107.1725, "city": "Cikarang"},
    {"name": "KC Karawang", "code": "KRW", "latitude": -6.3055, "longitude": 107.3010, "city": "Karawang"},
]


def seed_branches(session: Session) -> None:
    existing = session.exec(select(BranchPreset)).all()
    if existing:
        return
    for b in BRANCH_PRESETS:
        session.add(BranchPreset(**b))
    session.commit()
