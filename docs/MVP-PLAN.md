# BFTM Radar MVP Implementation Plan

## 🎯 Primary Goal

Ship a fully working MVP where BFTMs can drop a branch pin, discover 30+ verified entities within a 10 km radius in <3 seconds, enrich a batch of leads in <60 seconds with AI-powered signals, and export a ranked CSV with custom Indonesian pitch scripts—all integrated end-to-end between Next.js frontend and FastAPI backend, both deployed to Vercel.

---

## Current State: ✅ 100% SHIPPED & PRODUCTION READY

- **Ticket 1 ✅ Scaffold & Tracer Bullet:** Next.js 16 + Leaflet map (Indonesia centered), FastAPI backend, health check & branch presets.
- **Ticket 2 ✅ Hyperlocal Discovery Engine:** Google Places API (New) integration with Jabodetabek regional buffer geofencing.
- **Ticket 3 ✅ Mandiri Product Matching:** Deterministic 6-product rule engine with fit scores & pitch angles.
- **Ticket 4 ✅ ScrapeGraphAI Two-Tier Enrichment:** Real web scraping via `SearchGraph` & `SmartScraperGraph` with Gemini 2.0 Flash backbone.
- **Ticket 5 ✅ Lead Pipeline & CSV Export:** State machine (`New` $\rightarrow$ `Contacted` $\rightarrow$ `Visit Scheduled` $\rightarrow$ `Won`/`Dropped`) + 1-click CSV download.
- **Post-MVP Hardening ✅:** Neon PostgreSQL integration (`DATABASE_URL`), tactile drawer UI, granular loading states, automated regression test suite (`tests/test_api.py`), and unified agent skills (`/develop`, `/fix`, `/enhance`).

---

## Architecture & Deployment Model

### Dual Vercel Deployments
- **Frontend** (`frontend/`): Next.js 16 → one Vercel project (existing `frontend/vercel.json`)
- **Backend** (`backend/`): FastAPI serverless function → a second Vercel project, rooted at `backend/`
  - Local SQLite remains suitable for development only. Vercel Functions have ephemeral filesystems, so production lead/branch persistence requires a managed Postgres database (e.g. Vercel Marketplace Neon) before Ticket 5.
  - API calls from frontend via `NEXT_PUBLIC_API_URL=https://<backend-domain>/api`

### CI/CD
- **GitHub Actions** (`.github/workflows/deploy.yml`): Type-check → Lint → Build frontend, run on every push to main
- **Vercel Deploy:** Auto-triggered on push to main (after CI passes), front-end deployed to prod
- **Backend deployment:** Manual or second Vercel project for FastAPI (one-time setup)

### Skills Orchestration
1. **Frontend Design** — Visual hierarchy, palette, typography for discovery UI and lead table
2. **Emil Design Eng** — Micro-interactions, drawer/modal polish for enrichment and status updates
3. **Systematic Debugging** — Root cause tracing for API errors, scraping failures, auth/CORS issues

---

## Ticket Breakdown (Vertical Slices)

### **Ticket 2: Hyperlocal Discovery Engine & Map Interaction** (1–1.5 hrs)
**Goal:** User selects branch preset (or pins map), sets focused radius (1–5 km, default 3 km), clicks "Scan", populates lead table with high-density commercial & campus ecosystem leads.

**Frontend:**
- Branch Identity Card (anchored to Bank Mandiri KC Jakarta Wisma Danantara at Wisma Danantara Indonesia / ex Plaza Mandiri Kav. 36-38, with dynamic 1-click "Reset ke Cabang" button)
- Minimalist default map canvas (zero API key requirement) with 4 instant switchable tactile theme pills (`Minimalis`, `Modern`, `Gelap`, `Standar`)
- Map interaction: click to place pin, or use preset
- Radius slider (1–5 km) with dynamic track fill and live circle draw on map
- "Scan" button → trigger `POST /api/discover`
- Empty lead table (ready for Ticket 3 styling)

**Backend:**
- `POST /api/discover` endpoint: accept `{latitude, longitude, radius_km, categories?}` where radius_km is 1–5 km
- If `GOOGLE_PLACES_API_KEY` present: call Google Places API (New) with 4 parallel category buckets (`POPULARITY` ranking)
  - Query categories: `university`, `school`, `cafe`, `coffee_shop`, `restaurant`, `convenience_store` (Indomaret, Alfamart, FamilyMart), `supermarket`, `corporate_office`, `manufacturer`
- Fallback (no key): return 10 mock leads (scripted JSON) with plausible names, coords, addresses
- Return: `{leads: [{id, place_id, name, category, address, lat, lng, phone, website}, ...]}`
- **Store in DB**: Insert `Lead` rows; return with `place_id` as unique key (upsert if exists)

**Acceptance Check:**
- Select "KC Jakarta Thamrin", set radius 5 km, click Scan → table populates with 15–30 leads
- Each lead shows: Name, Category, Address, rough distance
- Map pins appear at each location
- No errors in console; network tab shows single `POST /api/discover` call

**Anti-Patterns:**
- Don't add multi-page pagination yet (Ticket 5)
- Don't call enrichment on discovery (separate step, Ticket 4)

---

### **Ticket 3: Mandiri Product Matching Engine** (45 min–1 hr)
**Goal:** Tag each discovered lead with matched Mandiri product(s), persona, fit score (0–100).

**Backend Logic:**
- Deterministic matching rules (no ML needed for MVP):
  ```
  School (SD/SMP/SMA) → "Tabungan SimPel (Siswa)" + "Payroll Mandiri (Guru/Staf)" | Score: 85
  University → "Livin' Mandiri Campus" + "GMM Campus Acquisition" | Score: 80
  Indomaret/Alfamart/FamilyMart → "GMM Campus Livin'" (if near university) | Score: 75
  Cafe/Restaurant → "Livin' Merchant" + "EDC Mandiri (QRIS/POS)" | Score: 70
  Factory/Industrial → "Payroll Mandiri" + "Corporate Cash Mgmt (KOPRA)" | Score: 80
  Retail/Supermarket → "Livin' Merchant" + "EDC Mandiri" | Score: 72
  Default → "Livin' Acquisition Booth" | Score: 50
  ```
- Enrich `Lead` model with: `recommended_product`, `pitch_angle` (persona), `fit_score`
- Update `GET /api/leads` and `POST /api/discover` responses to include these fields

**Frontend:**
- Display product badge on each table row (e.g. 🏢 "Payroll & EDC" in navy + gold)
- Show fit score as bar/star (0–100 scale)
- Color-code rows by score: 80+ = green accent, 60–79 = yellow, <60 = gray

**Acceptance Check:**
- Discover leads in Jakarta Thamrin
- School name appears with "Tabungan SimPel" badge, score ≥85
- Alfamart appears with "GMM Campus Livin'" badge if within 2 km of Trisakti University
- Coffee shop appears with "Livin' Merchant" badge, score ~70

**Anti-Patterns:**
- Don't add manually editable product tags yet (keep deterministic for MVP)
- Don't implement complex scoring (simple if/elif rules only)

---

### **Ticket 4: ScrapeGraphAI Two-Tier Enrichment & Pitch Generation** (1.5–2 hrs)
**Goal:** User selects lead(s), clicks "Deep-Dive Enrich", backend scrapes entity details and generates *Bahasa Indonesia* pitch scripts.

**Backend:**
- `POST /api/leads/enrich` endpoint: accept `{lead_ids: [...]}`
- For each lead:
  - If `website` exists: use ScrapeGraphAI `SmartScraperGraph` to extract: employee/student count, payment methods, accreditation
  - Else: use `SearchGraph` to web-search `"{place_name} {city}"` and extract size signals
  - **LLM provider**: Read from `.env` → default `OPENAI_API_KEY` with `gpt-4o-mini`, fallback to Gemini 1.5 Flash
  - Generate two pitch scripts (WhatsApp-safe, formal Bahasa Indonesia):
    ```
    pitch_script_wa: "Selamat pagi Ibu/Bapak Kepala Sekolah {name}. Kami dari Bank Mandiri. 
    Kami lihat sekolah Ibu/Bapak memiliki {count} siswa aktif. Mandiri punya solusi Tabungan SimPel 
    khusus untuk pelajar yang aman & mudah dikelola. Bisa kami bantu tahu lebih? 🏦"
    
    pitch_script_visit: "Proposal kunjungan: Kepala Sekolah {name}, {address}. 
    Topik: Solusi Tabungan Pelajar Mandiri + Payroll Guru. 
    Data: {count} siswa, payment channels: {methods}. Priority: HIGH."
    ```
  - Store in `LeadEnrichment` table (FK to `lead_id`)
- Return: `{lead_id, employee_count, payment_methods, pitch_script_wa, pitch_script_visit, enriched_at}`

**Frontend:**
- Add "Deep-Dive Enrich" button in lead table (next to each row or bulk select)
- Show enrichment progress: "Loading..." → spinner on selected rows
- Modal/drawer: display enriched signals + both pitch scripts side-by-side (copy-to-clipboard buttons)
- Format scripts as monospace, pre-formatted for pasting into WhatsApp

**UI Polish (using skills):**
- **frontend-design:** Intentional color for enrichment state (pending = light gray, enriched = soft green)
- **emil-design-eng:** Smooth drawer slide-in from right, 300ms ease, focus trap, ESC to close

**Acceptance Check:**
- Select school lead, click "Deep-Dive Enrich" → modal opens with 2–3 sec delay
- Modal shows: "Ditemukan: 650 siswa" + current payment methods (if scraped)
- Two pitch scripts appear, correctly formatted in Indonesian
- Copy buttons work; no console errors

**Anti-Patterns:**
- Don't implement real-time scraping progress (backend processes batch, returns all at once)
- Don't cache enrichment results indefinitely (re-fetch on user request for MVP)

---

### **Ticket 5: Lead Pipeline Management & CSV Export** (1 hr)
**Goal:** User updates lead status (New → Contacted → Visit Scheduled → Won/Dropped), downloads CSV with all lead data + pitch scripts.

**Backend:**
- `PATCH /api/leads/{id}/status` endpoint: accept `{status: "New" | "Contacted" | "Visit Scheduled" | "Won" | "Dropped"}`
  - Update `Lead.lead_status`, persist to DB
  - Return updated lead
- `GET /api/leads/export` endpoint: query all leads, return CSV
  - Columns: `name, category, address, phone, website, recommended_product, fit_score, lead_status, enriched_signals (JSON), pitch_script_wa, pitch_script_visit`
  - Stream as `Content-Disposition: attachment; filename="mandiri-radar-{branch_code}-{date}.csv"`

**Frontend:**
- Status dropdown per row (or inline select): New / Contacted / Visit Scheduled / Won / Dropped
- Status persists on row change (optimistic update + server confirm)
- "Export CSV" button (top-right of table) → browser download
- Display count badge: "15 New | 3 Contacted | 1 Visit Scheduled"

**Acceptance Check:**
- Change lead status to "Visited" → row color updates, status persists on page reload
- Click "Export CSV" → file downloads as `mandiri-radar-JKT-THR-2025-01-15.csv`
- Open CSV in Excel: all 15–30 leads visible with correct product tags + pitch scripts
- No Unicode encoding issues (UTF-8 BOM for Excel)

**Anti-Patterns:**
- Don't add multi-select bulk status updates yet (keep simple for MVP)
- Don't implement custom export filters yet (export everything)

---

## Skill Orchestration Flow

### Phase 0: Documentation & Validation (10 min)
- ✅ Read PRD.md, progress.md (already done)
- Confirm Google Places API key / fallback mock data approach
- Verify ScrapeGraphAI LiteLLM config (OpenAI vs Gemini)

### Phase 1: Ticket 2 (Discovery Engine) — 1 hr
1. **Backend:** Implement `POST /api/discover` with mock data
2. **Frontend:** Branch dropdown + map pin + radius slider + "Scan" button
3. **Styling:** Neutral grays, Tailwind, responsive sidebar
4. **Test:** Manual: branch select → discover → table populates

### Phase 2: Ticket 3 (Product Matching) — 45 min
1. **Backend:** Add matching logic to Lead model, update endpoints
2. **Frontend:** Display product badges + fit score bar
3. **Styling:** Navy + gold badges, color-coded rows
4. **Test:** Verify SDN 01 gets Tabungan SimPel, Alfamart gets GMM tag

### Phase 3: Ticket 4 (Enrichment) — 1.5 hrs
1. **Backend:** Integrate ScrapeGraphAI, `POST /api/leads/enrich`
2. **Frontend:** "Deep-Dive Enrich" button → modal/drawer
3. **Polish:** Drawer transitions, copy-to-clipboard, loading states
4. **Test:** Select lead → enrich → modal shows pitch scripts (mocked if no API key)

### Phase 4: Ticket 5 (Pipeline & Export) — 1 hr
1. **Backend:** Status endpoint + CSV export endpoint
2. **Frontend:** Inline status dropdown, export button
3. **Polish:** Optimistic updates, download naming
4. **Test:** Status persist, CSV downloads correctly

### Phase 5: Deployment & E2E Verification — 30 min
1. **Backend:** Deploy FastAPI to Vercel (or Docker container)
2. **Frontend:** Verify prod environment variables (`NEXT_PUBLIC_API_URL`)
3. **CI/CD:** Trigger full pipeline, test live deployment
4. **E2E:** Live URL: branch select → discover → enrich → export → download CSV

---

## Implementation Notes

### Environment Setup
**Frontend (`.env.local` or Vercel env):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000  # dev: local FastAPI
                   # prod: https://bftm-radar-api.vercel.app (after deployment)
```

**Backend (`.env`):**
```
GOOGLE_PLACES_API_KEY=<your key or empty for mock>
OPENAI_API_KEY=<for ScrapeGraphAI or Gemini>
FRONTEND_ORIGIN=http://localhost:3000  # dev: local Next.js
                                        # prod: https://bftm-radar.vercel.app
DATABASE_URL=sqlite:///./bftm_radar.db  # stays local for MVP
```

### Dependencies to Add
**Backend:**
```python
scrapegraphai>=1.0  # or latest
litellm>=1.0
httpx>=0.28.0  # for async Google Places calls
```

**Frontend:**
- Already has: `react-leaflet`, `leaflet`, `lucide-react`, `tailwindcss`
- May add: `lucide-react` for more icons (copy, download, check)

### Database Migrations
No migrations needed—SQLModel auto-creates tables on startup (`lifespan` already does this).

### Testing Strategy
- **Unit:** Backend endpoint validation (mock Google Places)
- **Integration:** End-to-end: discover → product match → enrich → export
- **Manual:** Live branch select, map interaction, CSV download

---

## Blockers & Risks

| Risk | Mitigation |
|------|-----------|
| Google Places API quota / cost | Use mock data for MVP; real API behind feature flag |
| ScrapeGraphAI flakiness (websites change) | Graceful degradation; return empty signals if scrape fails |
| Vercel FastAPI deployment complexity | Use serverless container; test locally first with `uvicorn` |
| CORS + frontend/backend split | Already configured; verify on each deployment |
| UTF-8 CSV export (Excel BOM) | Use `utf-8-sig` codec in Python CSV writer |

---

## Success Criteria

✅ **MVP Complete when:**
1. User can select branch + radius + click "Scan" → see 20+ leads in table
2. Each lead shows Mandiri product badge + fit score
3. User can select lead → "Deep-Dive Enrich" → modal with Indonesian pitch scripts
4. User can change lead status → persists
5. User can click "Export CSV" → downloads with all data
6. Both frontend & backend deploy to Vercel without errors
7. Live URL works end-to-end (no localhost required)

---

## Next Session Checkpoint

After **Ticket 5 complete + deployment**:
1. Update `docs/progress.md` with all 5 tickets marked `[x]`
2. Record any post-MVP backlog items (pagination, real API key setup, auth, etc.)
3. Store live deployment URLs in `docs/progress.md` for team reference

