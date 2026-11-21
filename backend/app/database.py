from sqlmodel import SQLModel, create_engine, Session
from app.config import settings

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

_is_postgres = db_url.startswith("postgresql")

engine = create_engine(
    db_url,
    connect_args={} if _is_postgres else {"check_same_thread": False},
    pool_pre_ping=True,  # handles Neon auto-suspend reconnect
    echo=False,
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
