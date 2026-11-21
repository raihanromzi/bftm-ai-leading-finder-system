"""Google Places discovery with deterministic mock fallback (PRD FR-2)."""

from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.models import Lead
from app.services.product_matching import match_product

router = APIRouter()


class DiscoverRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_km: int = Field(ge=1, le=25)
    categories: list[str] | None = None


MOCK_LEADS = [
    {"place_id": "mock-sdn-01", "name": "SDN 01 Jakarta Pusat", "category": "school", "address": "Jl. Thamrin No. 1, Jakarta Pusat", "latitude": -6.1930, "longitude": 106.8237, "phone_number": "+62 21 123 4567", "website": "https://sdn01jkt.sch.id"},
    {"place_id": "mock-trisakti", "name": "Universitas Trisakti", "category": "university", "address": "Jl. Kyai Tapa 1, Jakarta Barat", "latitude": -6.1890, "longitude": 106.8100, "phone_number": "+62 21 555 2888", "website": "https://www.trisakti.ac.id"},
    {"place_id": "mock-indomaret", "name": "Indomaret Thamrin Center", "category": "convenience_store", "address": "Thamrin Center, Jakarta Pusat", "latitude": -6.1920, "longitude": 106.8220, "phone_number": "+62 21 123 9999", "website": ""},
    {"place_id": "mock-kopi", "name": "Kopi Jauh Malam", "category": "cafe", "address": "Jl. Sudirman No. 50, Jakarta Pusat", "latitude": -6.1950, "longitude": 106.8260, "phone_number": "+62 21 456 7890", "website": ""},
    {"place_id": "mock-manufaktur", "name": "PT Manufaktur Indonesia", "category": "factory", "address": "Jl. Industri Raya, Jakarta Utara", "latitude": -6.1800, "longitude": 106.8350, "phone_number": "+62 21 777 8888", "website": ""},
]

GOOGLE_TYPES = ["school", "university", "cafe", "restaurant", "supermarket", "convenience_store"]


def category_from_types(types: list[str]) -> str:
    """Collapse Places types to the product engine's MVP categories."""
    joined = " ".join(types).lower()
    for category, aliases in {
        "school": ("school",),
        "university": ("university",),
        "convenience_store": ("convenience_store",),
        "cafe": ("cafe", "restaurant"),
        "supermarket": ("supermarket", "store"),
    }.items():
        if any(alias in joined for alias in aliases):
            return category
    return "community_hub"


async def google_places(req: DiscoverRequest) -> list[dict]:
    """Call Places API (New) Nearby Search. Called only when a key is configured."""
    body = {
        "includedTypes": req.categories or GOOGLE_TYPES,
        "maxResultCount": 20,
        "rankPreference": "DISTANCE",
        "languageCode": "id",
        "regionCode": "ID",
        "locationRestriction": {
            "circle": {
                "center": {"latitude": req.latitude, "longitude": req.longitude},
                "radius": req.radius_km * 1_000,
            }
        },
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.nationalPhoneNumber,places.websiteUri",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post("https://places.googleapis.com/v1/places:searchNearby", json=body, headers=headers)
        response.raise_for_status()
    return [
        {
            "place_id": place.get("id") or f"google-{uuid4()}",
            "name": place.get("displayName", {}).get("text", "Tanpa nama"),
            "category": category_from_types(place.get("types", [])),
            "address": place.get("formattedAddress", ""),
            "latitude": place.get("location", {}).get("latitude", req.latitude),
            "longitude": place.get("location", {}).get("longitude", req.longitude),
            "phone_number": place.get("nationalPhoneNumber", ""),
            "website": place.get("websiteUri", ""),
        }
        for place in response.json().get("places", [])
    ]


@router.post("/discover")
async def discover(req: DiscoverRequest, session: Session = Depends(get_session)):
    """Discover entities within allowed regions: Jakarta, Jabodetabek, Cikarang, Karawang."""
    # Restrict to Jabodetabek + Karawang + Cikarang (bounding box)
    # Latitude: -6.5 to -5.9, Longitude: 106.5 to 107.5
    if not (-6.5 <= req.latitude <= -5.9 and 106.5 <= req.longitude <= 107.5):
        raise HTTPException(
            status_code=400,
            detail="Pemindaian hanya tersedia di Jakarta, Jabodetabek, Cikarang, dan Karawang.",
        )

    source = "mock"
    if settings.google_places_api_key:
        try:
            leads_data = await google_places(req)
            source = "google_places"
        except httpx.HTTPError:
            leads_data = MOCK_LEADS
    else:
        leads_data = MOCK_LEADS

    if req.categories and source == "mock":
        leads_data = [lead for lead in leads_data if lead["category"] in req.categories]

    results = []
    for data in leads_data:
        match = match_product(data["category"])
        lead = session.exec(select(Lead).where(Lead.place_id == data["place_id"])).first()
        if lead is None:
            lead = Lead(**data, **match)
        else:
            for field, value in {**data, **match}.items():
                setattr(lead, field, value)
        session.add(lead)
        session.flush()
        results.append(lead.model_dump())

    session.commit()
    return {"source": source, "leads": results}
