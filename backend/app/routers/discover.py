"""Google Places discovery with deterministic local mock fallback (PRD FR-2)."""

from math import asin, cos, radians, sin, sqrt
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


MOCK_LEAD_TEMPLATES = [
    {"place_id": "mock-sdn-01", "name": "Sekolah Nusantara", "category": "school", "phone_number": "+62 21 123 4567", "website": ""},
    {"place_id": "mock-campus", "name": "Kampus Cakrawala", "category": "university", "phone_number": "+62 21 555 2888", "website": ""},
    {"place_id": "mock-convenience", "name": "Minimarket Setempat", "category": "convenience_store", "phone_number": "+62 21 123 9999", "website": ""},
    {"place_id": "mock-cafe", "name": "Kopi Sudut Kota", "category": "cafe", "phone_number": "+62 21 456 7890", "website": ""},
    {"place_id": "mock-factory", "name": "Sentra Usaha Lokal", "category": "factory", "phone_number": "+62 21 777 8888", "website": ""},
]
MOCK_OFFSETS = [(0.2, 15), (0.35, 110), (0.5, 205), (0.65, 285), (0.8, 45)]
GOOGLE_TYPES = ["school", "university", "cafe", "restaurant", "supermarket", "convenience_store"]


def distance_km(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> float:
    """Great-circle distance, used as a provider-independent radius guard."""
    lat_delta = radians(end_lat - start_lat)
    lng_delta = radians(end_lng - start_lng)
    a = sin(lat_delta / 2) ** 2 + cos(radians(start_lat)) * cos(radians(end_lat)) * sin(lng_delta / 2) ** 2
    return 2 * 6_371.0088 * asin(sqrt(a))


def mock_leads(req: DiscoverRequest) -> list[dict]:
    """Return deterministic placeholder POIs inside the requested scan circle."""
    leads = []
    for template, (ratio, bearing) in zip(MOCK_LEAD_TEMPLATES, MOCK_OFFSETS, strict=True):
        distance = req.radius_km * ratio
        lat_offset = distance * cos(radians(bearing)) / 111.32
        lng_offset = distance * sin(radians(bearing)) / (111.32 * cos(radians(req.latitude)))
        leads.append(
            {
                **template,
                "address": f"Area sekitar titik pemindaian ({distance:.1f} km)",
                "latitude": req.latitude + lat_offset,
                "longitude": req.longitude + lng_offset,
            }
        )
    return leads


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
            leads_data = mock_leads(req)
    else:
        leads_data = mock_leads(req)

    if req.categories:
        leads_data = [lead for lead in leads_data if lead["category"] in req.categories]

    # Google is asked for a circle; this guard keeps bad provider data off the map.
    leads_data = [
        lead
        for lead in leads_data
        if distance_km(req.latitude, req.longitude, lead["latitude"], lead["longitude"]) <= req.radius_km
    ]

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
