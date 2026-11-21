# MVP Build Progress & Ticket Queue

## Current Status — Deployment Slice Verified
- **Frontend:** Vercel deploy succeeds. `NEXT_PUBLIC_API_URL` is not configured, so deployed UI defaults to `http://localhost:8000`.
- **Backend:** Vercel production deployment Ready at `https://backend-three-pi-11.vercel.app`.
- **Verified live:** `GET /api/health`, `GET /api/branches` (8 presets), `POST /api/discover` (5 mock leads), status update to `Contacted`, CSV export (6 rows).
- **Last Updated By:** Claude Code
- **Latest Commits:** 
  - `cdec077`: timezone-aware SQLModel timestamps
  - `bb9c067`: in-memory SQLite for Vercel Functions
  - `346846f`: trigger backend redeployment
  - `95e008b`: Vercel FastAPI config
- **Known Constraints / Next Ticket:**
  - Vercel Deployment Protection blocks unauthenticated browser-to-backend calls.
  - Vercel in-memory SQLite persists only per warm function instance; status and leads are not durable. Add managed Postgres before treating Ticket 5 persistence as complete.
  - Ticket 4 (`POST /api/leads/enrich`, ScrapeGraphAI, pitch drawer) remains unimplemented.
  - Set `NEXT_PUBLIC_API_URL` and backend `FRONTEND_ORIGIN`, then run browser E2E verification.

## Completed Slices
- [x] **PRD & Architecture Locked** — Defined problem, core user flow, FRs, non-goals, stack, and data schema in [PRD.md](file:///Users/raihanromzi/Documents/Development/bftm-ai-leading-finder-system/docs/PRD.md).
- [x] **Ticket 1: Project Scaffold & Tracer Bullet**
  - Next.js 16 frontend with Tailwind CSS, Lucide icons, responsive sidebar, Leaflet map of Indonesia (-2.5489, 118.0149), and backend polling health status indicator.
  - FastAPI backend with lifespan SQLite DB initialization, CORS, seed branches (8 Mandiri presets), and endpoints: `GET /api/health` and `GET /api/branches`.
  - Full CI/CD workflow configured in `.github/workflows/deploy.yml` with `vercel.json` pointing to `frontend/`.
  - *Created Files:*
    - `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`, `frontend/src/app/not-found.tsx`
    - `frontend/src/components/RadarWorkspace.tsx`, `frontend/src/components/RadarMap.tsx`
    - `frontend/next.config.ts`, `frontend/package.json`
    - `backend/main.py`, `backend/requirements.txt`, `backend/app/config.py`, `backend/app/database.py`, `backend/app/models.py`, `backend/app/seed_branches.py`, `backend/app/routers/health.py`, `backend/app/routers/branches.py`
  - *Acceptance Check:* Passed `npm run type-check`, `npm run lint`, `npm run build` (exit 0) and FastAPI `GET /api/health` + `GET /api/branches` (exit 0).

## Ticket Queue (Vertical MVP Slices)
- [x] **Ticket 2: Hyperlocal Discovery Engine (Google Places & Map Pin)**
  - Implement branch presets dropdown + map pin click + radius circle (1–25 km).
  - Implement `POST /api/discover` querying Google Places API for Indonesian categories (schools, retail, factories, student hubs) with mock fallback if no API key is provided yet.
  - *Acceptance Check:* Dropping a pin on Jakarta Thamrin with 5 km radius returns a populated lead table and map markers with place names, addresses, and coordinates.

- [ ] **Ticket 3: Bank Mandiri Rule-Gated Product Engine**
  - Implement deterministic product matching engine (SimPel, Payroll, Livin' Merchant, EDC Mandiri, GMM Campus Livin').
  - Tag each discovered lead with product badge, target persona, and initial fit score (0–100).
  - *Acceptance Check:* Discovered school tags as "Tabungan SimPel & Payroll", Alfamart near campus tags as "GMM / Livin' Campus Acquisition", coffee shop tags as "Livin' Merchant & EDC".

- [ ] **Ticket 4: ScrapeGraphAI Two-Tier Enrichment & Pitch Generator**
  - Implement `POST /api/leads/enrich` with ScrapeGraphAI hybrid pipeline (`SmartScraperGraph` for URLs, `SearchGraph` for entity web presence fallback).
  - Extract qualifying signals (size/headcount, payment options) and generate *Bahasa Indonesia formal-santun* pitch scripts for WhatsApp and visits.
  - Add UI "Deep-Dive Enrich" trigger with live progress indicator and modal/drawer to inspect scripts.
  - *Acceptance Check:* Clicking "Deep-Dive Enrich" on a selected lead populates headcount/signals and displays a tailored Indonesian WhatsApp pitch script.

- [ ] **Ticket 5: Lead Pipeline Management & CSV Field Export**
  - Implement lead status selector (`New` $\rightarrow$ `Contacted` $\rightarrow$ `Visit Scheduled` $\rightarrow$ `Won` / `Dropped`) with SQLite persistence.
  - Implement 1-click CSV export endpoint `GET /api/leads/export` and client-side download button.
  - *Acceptance Check:* Changing a lead's status to "Visit Scheduled" persists on page reload; clicking "Export CSV" downloads a spreadsheet with all contact details, product tags, and pitch scripts.
