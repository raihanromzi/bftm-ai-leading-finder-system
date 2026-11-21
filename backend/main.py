from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_db_and_tables, get_session
from app.models import BranchPreset  # noqa: F401 — registers table with SQLModel metadata
from app.seed_branches import seed_branches
from app.routers import health, branches


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Seed branch presets on first run
    from sqlmodel import Session
    from app.database import engine
    with Session(engine) as session:
        seed_branches(session)
    yield


app = FastAPI(
    title="BFTM Radar API",
    description="Hyperlocal lead discovery backend for Bank Mandiri field officers",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(branches.router, prefix="/api")
