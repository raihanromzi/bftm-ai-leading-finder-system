from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class BranchPreset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    code: str
    latitude: float
    longitude: float
    city: str


class Lead(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    place_id: str = Field(index=True, unique=True)
    name: str
    category: str
    address: str
    latitude: float
    longitude: float
    phone_number: str = ""
    website: str = ""
    recommended_product: str = ""
    pitch_angle: str = ""
    fit_score: int = 0
    lead_status: str = "New"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LeadEnrichment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lead_id: int = Field(foreign_key="lead.id", index=True)
    raw_scraped_summary: str = ""
    employee_or_student_count: int = 0
    current_payment_methods: str = ""
    pitch_script_wa: str = ""
    pitch_script_visit: str = ""
    enriched_at: datetime = Field(default_factory=datetime.utcnow)
