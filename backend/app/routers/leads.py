"""Lead management: status updates, enrichment, CSV export."""

import csv
import io
import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.models import Lead, LeadEnrichment
from app.services.scraper import scrape_lead_context

router = APIRouter()


class StatusUpdateRequest(BaseModel):
    status: str  # "New", "Contacted", "Visit Scheduled", "Won", "Dropped"


class EnrichRequest(BaseModel):
    lead_ids: list[int]


def _mock_enrichment_for_lead(lead: Lead) -> tuple[dict, str, str]:
    signals = {
        "employee_count": 150 if lead.category == "factory" else 50,
        "current_payment": "Cash only" if lead.category == "cafe" else "Multiple channels",
        "news_signal": f"Perusahaan {lead.name} berkembang pesat di {lead.address.split(',')[-1]}",
    }
    pitch_wa = (
        f"Halo Ibu/Bapak {lead.name.split()[0]}, kami dari Bank Mandiri. "
        f"Kami lihat {lead.name} sedang berkembang dan membutuhkan solusi pembayaran digital. "
        f"Produk kami {lead.recommended_product} cocok untuk {lead.category} Anda. "
        f"Bisa kami diskusi lebih lanjut?"
    )
    pitch_visit = (
        f"Selamat pagi, kami dari Bank Mandiri. Kami ingin menawarkan {lead.recommended_product} "
        f"untuk meningkatkan efisiensi bisnis {lead.name}. Tersedia karyawan {signals['employee_count']} orang. "
        f"Metode pembayaran saat ini: {signals['current_payment']}."
    )
    return signals, pitch_wa, pitch_visit


async def _gemini_enrichment_for_lead(lead: Lead, scraped_context: str = "") -> tuple[dict, str, str, str]:
    """Generate lead enrichment signals and Bahasa Indonesia pitch scripts via Gemini grounded with ScrapeGraphAI."""
    scraped_section = (
        f"\nData publik & web yang berhasil diekstrak (ScrapeGraphAI):\n{scraped_context}\n"
        if scraped_context else ""
    )
    prompt = (
        "Anda adalah asisten BFTM (Branch Funding Transaction Manager) Bank Mandiri di wilayah Jabodetabek. "
        "Gunakan data publik & web berikut (jika ada) untuk menghasilkan analisis akurat dan naskah penawaran dalam Bahasa Indonesia yang sopan, ringkas, dan natural.\n"
        f"Nama entitas: {lead.name}\n"
        f"Kategori: {lead.category}\n"
        f"Alamat: {lead.address}\n"
        f"Produk rekomendasi Mandiri: {lead.recommended_product}\n"
        f"Target pengambil keputusan: {lead.pitch_angle}\n"
        f"{scraped_section}\n"
        "Kembalikan JSON valid dengan field persis:\n"
        '{"employee_count": <integer estimasi karyawan/siswa>, '
        '"current_payment": "<string metode pembayaran saat ini atau umum>", '
        '"news_signal": "<1 kalimat ringkasan potensi akuisisi berbasis data>", '
        '"pitch_wa": "<pesan WhatsApp singkat <= 3 kalimat>", '
        '"pitch_visit": "<skrip pembuka kunjungan tatap muka <= 3 kalimat>"}'
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.4,
        },
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            url,
            params={"key": settings.gemini_api_key},
            json=payload,
        )
        response.raise_for_status()
    data = response.json()
    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
    parsed = json.loads(raw_text)
    signals = {
        "employee_count": int(parsed.get("employee_count") or 50),
        "current_payment": str(parsed.get("current_payment") or "QRIS / Transfer"),
        "news_signal": str(parsed.get("news_signal") or f"Potensi kerja sama transaksi dengan {lead.name}."),
    }
    pitch_wa = str(parsed.get("pitch_wa") or "")
    pitch_visit = str(parsed.get("pitch_visit") or "")
    if not pitch_wa or not pitch_visit:
        raise ValueError("Incomplete Gemini response")
    return signals, pitch_wa, pitch_visit, settings.gemini_model


@router.post("/leads/enrich")
async def enrich_leads(req: EnrichRequest, session: Session = Depends(get_session)):
    """Enrich selected leads using ScrapeGraphAI + Gemini with mock fallback."""
    if not req.lead_ids:
        raise HTTPException(status_code=400, detail="No lead IDs provided")

    results = []
    for lead_id in req.lead_ids:
        lead = session.get(Lead, lead_id)
        if not lead:
            continue

        ai_source = "mock"
        if settings.gemini_api_key:
            scraped_context = ""
            try:
                # Tier 1: Scrape real web / public directories via ScrapeGraphAI
                scraped_context = await scrape_lead_context(
                    name=lead.name,
                    address=lead.address,
                    category=lead.category,
                    website=lead.website,
                )
            except Exception:
                scraped_context = ""

            try:
                # Tier 2: Grounded synthesis & pitch generation via Gemini
                signals, pitch_wa, pitch_visit, _ = await _gemini_enrichment_for_lead(lead, scraped_context)
                ai_source = "scrapegraphai" if scraped_context else "gemini"
            except (httpx.HTTPError, KeyError, IndexError, ValueError, json.JSONDecodeError):
                signals, pitch_wa, pitch_visit = _mock_enrichment_for_lead(lead)
        else:
            signals, pitch_wa, pitch_visit = _mock_enrichment_for_lead(lead)

        enrichment = session.exec(
            select(LeadEnrichment).where(LeadEnrichment.lead_id == lead_id)
        ).first()
        if not enrichment:
            enrichment = LeadEnrichment(lead_id=lead_id)
        enrichment.raw_scraped_summary = signals["news_signal"]
        enrichment.employee_or_student_count = signals["employee_count"]
        enrichment.current_payment_methods = signals["current_payment"]
        enrichment.pitch_script_wa = pitch_wa
        enrichment.pitch_script_visit = pitch_visit
        enrichment.enriched_at = datetime.now(timezone.utc)

        session.add(enrichment)
        results.append({
            "lead_id": lead_id,
            "name": lead.name,
            "source": ai_source,
            "pitch_wa": pitch_wa,
            "pitch_visit": pitch_visit,
            "signals": signals,
        })

    session.commit()
    return {"enriched_count": len(results), "results": results}


@router.patch("/leads/{lead_id}/status")
async def update_lead_status(lead_id: int, req: StatusUpdateRequest, session: Session = Depends(get_session)):
    """Update a lead's status with validation."""
    allowed_statuses = {"New", "Contacted", "Visit Scheduled", "Won", "Dropped"}
    if req.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Status harus salah satu dari: {', '.join(allowed_statuses)}"
        )

    lead = session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead tidak ditemukan")

    lead.lead_status = req.status
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return {
        "id": lead.id,
        "name": lead.name,
        "lead_status": lead.lead_status,
    }


@router.get("/leads")
async def list_leads(session: Session = Depends(get_session)):
    """Fetch all leads with enrichment data joined."""
    leads = session.exec(select(Lead)).all()
    result = []
    for lead in leads:
        enrichment = session.exec(select(LeadEnrichment).where(LeadEnrichment.lead_id == lead.id)).first()
        result.append({
            "id": lead.id,
            "place_id": lead.place_id,
            "name": lead.name,
            "category": lead.category,
            "address": lead.address,
            "latitude": lead.latitude,
            "longitude": lead.longitude,
            "phone_number": lead.phone_number,
            "website": lead.website,
            "recommended_product": lead.recommended_product,
            "pitch_angle": lead.pitch_angle,
            "fit_score": lead.fit_score,
            "lead_status": lead.lead_status,
            "enrichment": {
                "employee_or_student_count": enrichment.employee_or_student_count if enrichment else 0,
                "current_payment_methods": enrichment.current_payment_methods if enrichment else "",
                "pitch_script_wa": enrichment.pitch_script_wa if enrichment else "",
                "pitch_script_visit": enrichment.pitch_script_visit if enrichment else "",
            } if enrichment else None,
        })
    return {"leads": result}


@router.get("/leads/export")
async def export_leads(session: Session = Depends(get_session)):
    """Stream CSV export of all leads with enrichment data."""
    leads = session.exec(select(Lead)).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Name", "Category", "Address", "Phone", "Website",
        "Product", "Fit Score", "Status",
        "Employee Count", "Payment Methods", "Pitch (WhatsApp)"
    ])

    # Rows
    for lead in leads:
        enrichment = session.exec(select(LeadEnrichment).where(LeadEnrichment.lead_id == lead.id)).first()
        writer.writerow([
            lead.name,
            lead.category,
            lead.address,
            lead.phone_number,
            lead.website,
            lead.recommended_product,
            lead.fit_score,
            lead.lead_status,
            enrichment.employee_or_student_count if enrichment else "",
            enrichment.current_payment_methods if enrichment else "",
            enrichment.pitch_script_wa if enrichment else "",
        ])

    # Build filename
    branch_code = "BFTM"
    date_str = datetime.now().strftime("%Y-%m-%d")
    filename = f"mandiri-radar-{branch_code}-{date_str}.csv"

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
