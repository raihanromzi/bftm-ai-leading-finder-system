"""Lead management: status updates, enrichment, CSV export."""

import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from pydantic import BaseModel

from app.database import get_session
from app.models import Lead, LeadEnrichment

router = APIRouter()


class StatusUpdateRequest(BaseModel):
    status: str  # "New", "Contacted", "Visit Scheduled", "Won", "Dropped"


class EnrichRequest(BaseModel):
    lead_ids: list[int]


@router.post("/leads/enrich")
async def enrich_leads(req: EnrichRequest, session: Session = Depends(get_session)):
    """
    Enrich selected leads with mock signals and generate pitch scripts.
    MVP: Mock enrichment. Production: integrate ScrapeGraphAI + Gemini.
    """
    if not req.lead_ids:
        raise HTTPException(status_code=400, detail="No lead IDs provided")

    results = []
    for lead_id in req.lead_ids:
        lead = session.get(Lead, lead_id)
        if not lead:
            continue

        # Mock enrichment signals
        signals = {
            "employee_count": 150 if lead.category == "factory" else 50,
            "current_payment": "Cash only" if lead.category == "cafe" else "Multiple channels",
            "news_signal": f"Perusahaan {lead.name} berkembang pesat di {lead.address.split(',')[-1]}",
        }

        # Generate pitch script (Bahasa Indonesia)
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

        # Upsert enrichment record
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
            "pitch_wa": pitch_wa,
            "pitch_visit": pitch_visit,
            "signals": signals,
        })

    session.commit()
    return {"enriched_count": len(results), "results": results}


@router.patch("/leads/{lead_id}/status")
async def update_lead_status(lead_id: int, req: StatusUpdateRequest, session: Session = Depends(get_session)):
    """Update a lead's status."""
    lead = session.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": "Lead not found"}, 404
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
        enrichment = session.query(LeadEnrichment).filter(LeadEnrichment.lead_id == lead.id).first()
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
        enrichment = session.query(LeadEnrichment).filter(LeadEnrichment.lead_id == lead.id).first()
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
