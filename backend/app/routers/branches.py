from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import BranchPreset
from app.seed_branches import seed_branches

router = APIRouter()


@router.get("/branches")
async def list_branches(session: Session = Depends(get_session)):
    branches = session.exec(select(BranchPreset)).all()
    if not branches or len(branches) > 1 or branches[0].code != "JKT-DANANTARA":
        seed_branches(session)
        branches = session.exec(select(BranchPreset)).all()
    return {"branches": [b.model_dump() for b in branches]}
