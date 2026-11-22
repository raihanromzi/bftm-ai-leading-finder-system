"""Google Places discovery with deterministic local mock fallback (PRD FR-2)."""

import asyncio
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
    radius_km: int = Field(ge=1, le=5)
    categories: list[str] | None = None


MOCK_LEAD_TEMPLATES = [
    {"place_id": "mock-campus-01", "name": "Universitas Cakrawala", "category": "university", "phone_number": "+62 21 555 2888", "website": "https://cakrawala.ac.id"},
    {"place_id": "mock-cafe-01", "name": "Kopi Kancana Campus Hub", "category": "cafe", "phone_number": "+62 812 4567 8901", "website": ""},
    {"place_id": "mock-mart-01", "name": "Indomaret Point Kampus", "category": "convenience_store", "phone_number": "+62 21 123 9999", "website": ""},
    {"place_id": "mock-mart-02", "name": "Alfamart Fresh Kawasan", "category": "convenience_store", "phone_number": "+62 21 123 8888", "website": ""},
    {"place_id": "mock-food-01", "name": "Kantin & Resto Selera Mahasiswa", "category": "cafe", "phone_number": "+62 813 9988 7766", "website": ""},
    {"place_id": "mock-sdn-01", "name": "SD & SMP Nusantara Unggul", "category": "school", "phone_number": "+62 21 123 4567", "website": ""},
    {"place_id": "mock-cafe-02", "name": "FamilyMart Express Transit", "category": "convenience_store", "phone_number": "+62 21 456 1122", "website": ""},
    {"place_id": "mock-corp-01", "name": "Sentra Niaga & Kantor Operasional", "category": "factory", "phone_number": "+62 21 777 8888", "website": ""},
    {"place_id": "mock-super-01", "name": "Superindo Pasar Segar", "category": "supermarket", "phone_number": "+62 21 888 2211", "website": ""},
    {"place_id": "mock-mfg-01", "name": "Workshop & Logistik Terpadu", "category": "factory", "phone_number": "+62 21 333 4455", "website": ""},
]
MOCK_OFFSETS = [
    (0.15, 20), (0.25, 75), (0.35, 140), (0.45, 190), (0.55, 230),
    (0.65, 280), (0.72, 320), (0.80, 50), (0.88, 110), (0.95, 160)
]
GOOGLE_TYPES = ["school", "university", "cafe", "restaurant", "supermarket", "convenience_store"]

# Jabodetabek core bounding box + 40 km outside Jabodetabek
JABODETABEK_LAT_MIN = -6.70
JABODETABEK_LAT_MAX = -6.08
JABODETABEK_LNG_MIN = 106.45
JABODETABEK_LNG_MAX = 107.22
MAX_OUTSIDE_JABODETABEK_KM = 40.0


def distance_km(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> float:
    """Great-circle distance, used as a provider-independent radius guard."""
    lat_delta = radians(end_lat - start_lat)
    lng_delta = radians(end_lng - start_lng)
    a = sin(lat_delta / 2) ** 2 + cos(radians(start_lat)) * cos(radians(end_lat)) * sin(lng_delta / 2) ** 2
    return 2 * 6_371.0088 * asin(sqrt(a))


def is_within_jabodetabek_buffer(latitude: float, longitude: float) -> bool:
    """Return True if coordinates are inside Jabodetabek or within 40 km outside it."""
    clamped_lat = min(max(latitude, JABODETABEK_LAT_MIN), JABODETABEK_LAT_MAX)
    clamped_lng = min(max(longitude, JABODETABEK_LNG_MIN), JABODETABEK_LNG_MAX)
    return distance_km(latitude, longitude, clamped_lat, clamped_lng) <= MAX_OUTSIDE_JABODETABEK_KM


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
        "school": ("school", "primary_school", "secondary_school"),
        "university": ("university", "college"),
        "factory": ("factory", "manufacturer", "industrial", "corporate_office"),
        "convenience_store": ("convenience_store", "grocery_store", "market"),
        "cafe": ("cafe", "coffee", "restaurant", "bakery", "fast_food"),
        "supermarket": ("supermarket", "shopping_mall", "store", "department_store"),
    }.items():
        if any(alias in joined for alias in aliases):
            return category
    return "community_hub"


SEARCH_BUCKETS = [
    # 1. Higher Education & Schools (SimPel, Payroll, GMM Acquisition)
    ["university", "college", "school", "secondary_school", "primary_school"],
    # 2. Campus & Neighborhood F&B / Coffee Hubs (Livin' Merchant & EDC)
    ["cafe", "coffee_shop", "restaurant", "bakery", "fast_food_restaurant"],
    # 3. Daily Retail Chains & Outlets (Indomaret, Alfamart, FamilyMart, Superindo)
    ["convenience_store", "supermarket", "grocery_store", "shopping_mall"],
    # 4. Corporate & Industrial Workplaces (Payroll Mandiri & KOPRA)
    ["corporate_office", "manufacturer"],
]


async def _fetch_places_bucket(
    client: httpx.AsyncClient,
    req: DiscoverRequest,
    types: list[str],
    max_count: int = 8,
) -> list[dict]:
    body = {
        "includedTypes": types,
        "maxResultCount": max_count,
        "rankPreference": "POPULARITY",
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
    try:
        response = await client.post(
            "https://places.googleapis.com/v1/places:searchNearby",
            json=body,
            headers=headers,
        )
        if response.status_code == 200:
            return response.json().get("places", [])
    except Exception:
        pass
    return []


async def google_places(req: DiscoverRequest) -> list[dict]:
    """Call Places API (New) with balanced category buckets across the full radius."""
    raw_places = []
    async with httpx.AsyncClient(timeout=12) as client:
        if req.categories:
            raw_places = await _fetch_places_bucket(client, req, req.categories, max_count=20)
        else:
            bucket_results = await asyncio.gather(
                *[_fetch_places_bucket(client, req, bucket, max_count=12) for bucket in SEARCH_BUCKETS]
            )
            seen_ids = set()
            for places in bucket_results:
                for p in places:
                    pid = p.get("id")
                    if pid and pid not in seen_ids:
                        seen_ids.add(pid)
                        raw_places.append(p)

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
        for place in raw_places
    ]


@router.post("/discover")
async def discover(req: DiscoverRequest, session: Session = Depends(get_session)):
    """Discover entities locked to Jabodetabek + 40 km outside Jabodetabek."""
    if not is_within_jabodetabek_buffer(req.latitude, req.longitude):
        raise HTTPException(
            status_code=400,
            detail="Pemindaian terkunci hanya untuk wilayah Jabodetabek dan maksimal 40 km di luar Jabodetabek.",
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

    # Enforce both scan radius and Jabodetabek + 40 km geofence so no out-of-area leads load.
    leads_data = [
        lead
        for lead in leads_data
        if distance_km(req.latitude, req.longitude, lead["latitude"], lead["longitude"]) <= req.radius_km
        and is_within_jabodetabek_buffer(lead["latitude"], lead["longitude"])
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
