"""Location search via Nominatim (OpenStreetMap) with coordinate autocomplete (PRD FR-1)."""

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "bftm-radar-mvp/1.0 (Bank Mandiri BFTM workspace)"


class GeoSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=200)


class GeoPlace(BaseModel):
    label: str
    latitude: float
    longitude: float


@router.post("/geocode/search")
async def search_places(req: GeoSearchRequest):
    """Resolve a free-text place query to Indonesian-friendly coordinates.

    Uses OpenStreetMap Nominatim (no API key, fair-use 1 req/s per policy).
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Kueri lokasi kosong.")

    params = {
        "q": req.query.strip(),
        "format": "jsonv2",
        "limit": 5,
        "addressdetails": 0,
        "accept-language": "id",
    }
    headers = {"User-Agent": USER_AGENT}
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(NOMINATIM_SEARCH, params=params, headers=headers)
            response.raise_for_status()
            raw = response.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Layanan pencarian lokasi tidak merespons. Coba lagi sebentar.")

    places = [
        GeoPlace(
            label=place.get("display_name", "Lokasi tanpa nama"),
            latitude=float(place["lat"]),
            longitude=float(place["lon"]),
        ).model_dump()
        for place in raw
        if place.get("lat") and place.get("lon")
    ]
    return {"places": places}
