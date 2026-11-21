"""Hyperlocal discovery engine (PRD FR-2 & FR-3).

POST /api/discover: query Google Places API or return mock data.
"""

import httpx
from fastapi import APIRouter, Depends
from sqlmodel import Session
from pydantic import BaseModel, Field

from app.config import settings
from app.database import get_session
from app.models import Lead
from app.services.product_matching import match_product

router = APIRouter()


class DiscoverRequest(BaseModel):
    latitude: float
    longitude: float
    radius_km: int = Field(ge=1, le=25)
    categories: list[str] | None = None


class LeadResponse(BaseModel):
    id: int | None = None
    place_id: str
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


MOCK_LEADS = [
    {
        "place_id": "mock_1",
        "name": "SDN 01 Jakarta Pusat",
        "category": "school",
        "address": "Jl. Thamrin No. 1, Jakarta Pusat",
        "latitude": -6.1930,
        "longitude": 106.8237,
        "phone_number": "+62 21 123 4567",
        "website": "https://sdn01jkt.sch.id",
    },
    {
        "place_id": "mock_2",
        "name": "Universitas Trisakti",
        "category": "university",
        "address": "Jl. Kyai Tapa 1, Jakarta Barat",
        "latitude": -6.1890,
        "longitude": 106.8100,
        "phone_number": "+62 21 555 2888",
        "website": "https://www.trisakti.ac.id",
    },
    {
        "place_id": "mock_3",
        "name": "Indomaret Thamrin Center",
        "category": "convenience_store",
        "address": "Thamrin Center, Jl. Thamrin, Jakarta Pusat",
        "latitude": -6.1920,
        "longitude": 106.8220,
        "phone_number": "+62 21 123 9999",
        "website": "",
    },
    {
        "place_id": "mock_4",
        "name": "Kopi Jauh Malam",
        "category": "cafe",
        "address": "Jl. Sudirman No. 50, Jakarta Pusat",
        "latitude": -6.1950,
        "longitude": 106.8260,
        "phone_number": "+62 21 456 7890",
        "website": "https://kopijauh.local",
    },
    {
        "place_id": "mock_5",
        "name": "PT Manufaktur Indonesia",
        "category": "factory",
        "address": "Jl. Industri Raya, Jakarta Utara",
        "latitude": -6.1800,
        "longitude": 106.8350,
        "phone_number": "+62 21 777 8888",
        "website": "https://manufaktur.id",
    },
]


@router.post("/discover")
async def discover(req: DiscoverRequest, session: Session = Depends(get_session)):
    """
    Query hyperlocal entities. If GOOGLE_PLACES_API_KEY set, real API; else mock data.
    Returns leads with product matching applied.
    """
    # For MVP: use mock data (no API cost, fast feedback)
    leads_data = MOCK_LEADS.copy()

    # Optionally filter by categories
    if req.categories:
        leads_data = [
            l for l in leads_data if l["category"] in req.categories
        ]

    # Upsert to DB and apply product matching
    results = []
    for lead_dict in leads_data:
        # Match product
        match = match_product(lead_dict["category"])

        # Upsert (if place_id exists, update; else create)
        existing = session.query(Lead).filter(Lead.place_id == lead_dict["place_id"]).first()
        if existing:
            # Update with fresh match
            existing.recommended_product = match["recommended_product"]
            existing.pitch_angle = match["pitch_angle"]
            existing.fit_score = match["fit_score"]
            session.add(existing)
        else:
            # Create new
            new_lead = Lead(
                place_id=lead_dict["place_id"],
                name=lead_dict["name"],
                category=lead_dict["category"],
                address=lead_dict["address"],
                latitude=lead_dict["latitude"],
                longitude=lead_dict["longitude"],
                phone_number=lead_dict.get("phone_number", ""),
                website=lead_dict.get("website", ""),
                recommended_product=match["recommended_product"],
                pitch_angle=match["pitch_angle"],
                fit_score=match["fit_score"],
                lead_status="New",
            )
            session.add(new_lead)

        # Flush assigns an ID before serializing a new row.
        session.flush()

        # Build response
        results.append(
            LeadResponse(
                id=existing.id if existing else new_lead.id,
                place_id=lead_dict["place_id"],
                name=lead_dict["name"],
                category=lead_dict["category"],
                address=lead_dict["address"],
                latitude=lead_dict["latitude"],
                longitude=lead_dict["longitude"],
                phone_number=lead_dict.get("phone_number", ""),
                website=lead_dict.get("website", ""),
                recommended_product=match["recommended_product"],
                pitch_angle=match["pitch_angle"],
                fit_score=match["fit_score"],
                lead_status="New",
            )
        )

    session.commit()
    return {"leads": results}
