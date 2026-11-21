"""Seed preset Mandiri branch locations."""
from sqlmodel import Session, select
from app.models import BranchPreset

BRANCH_PRESETS = [
    {"name": "KC Jakarta Thamrin", "code": "JKT-THR", "latitude": -6.1930, "longitude": 106.8237, "city": "Jakarta"},
    {"name": "KCP Bandung Dago", "code": "BDG-DAG", "latitude": -6.8947, "longitude": 107.6103, "city": "Bandung"},
    {"name": "KC Surabaya Basuki Rahmat", "code": "SBY-BSR", "latitude": -7.2619, "longitude": 112.7416, "city": "Surabaya"},
    {"name": "KC Medan Imam Bonjol", "code": "MDN-IB", "latitude": 3.5952, "longitude": 98.6722, "city": "Medan"},
    {"name": "KC Makassar Sam Ratulangi", "code": "MKS-SR", "latitude": -5.1477, "longitude": 119.4327, "city": "Makassar"},
    {"name": "KC Yogyakarta Sudirman", "code": "YGY-SDM", "latitude": -7.7956, "longitude": 110.3695, "city": "Yogyakarta"},
    {"name": "KC Semarang Pemuda", "code": "SMG-PMD", "latitude": -6.9932, "longitude": 110.4203, "city": "Semarang"},
    {"name": "KC Palembang Sudirman", "code": "PLB-SDM", "latitude": -2.9915, "longitude": 104.7593, "city": "Palembang"},
]


def seed_branches(session: Session) -> None:
    existing = session.exec(select(BranchPreset)).all()
    if existing:
        return
    for b in BRANCH_PRESETS:
        session.add(BranchPreset(**b))
    session.commit()
