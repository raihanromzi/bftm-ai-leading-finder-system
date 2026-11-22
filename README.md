# BFTM Radar — Hyperlocal Lead Finder for Bank Mandiri

**MVP Status:** ✅ **SHIPPED & PRODUCTION READY**

**Live Deployments:**
- 🌐 **Frontend App:** [https://frontend-en92sazwe-raihan-romzi-rs-projects.vercel.app](https://frontend-en92sazwe-raihan-romzi-rs-projects.vercel.app)
- ⚙️ **Backend API (Swagger Docs):** [https://backend-three-pi-11.vercel.app/docs](https://backend-three-pi-11.vercel.app/docs)

A specialized web workspace for Bank Mandiri Branch Funding Transaction Managers (BFTMs) to discover, qualify, and engage nearby commercial and educational entities for financial product acquisition within a customizable radar radius.

---

## Key Features

- 📍 **Hyperlocal Territory Radar:** Interactive map (Leaflet) anchored to Bank Mandiri KC Jakarta Wisma Danantara (Wisma Danantara Indonesia / ex Plaza Mandiri, Jl. Jend. Gatot Subroto Kav. 36–38) with tactile Branch Identity Card, instant reset button, focused radius slider (1–5 km, default 3 km), and a minimalist default map theme (CartoDB Positron) with 4 switchable visual styles (`Minimalis`, `Modern`, `Gelap`, `Standar`).
- 🔍 **Deep Commercial Ecosystem Discovery:** Google Places API (New) integration with 4 parallel search buckets (Campuses & Schools, Cafes & Coffee Hubs, Retail Chains like Indomaret/Alfamart/FamilyMart, and Corporate/Workplaces) retrieving dense, actionable leads across the target radius.
- 🎯 **Rule-Gated Bank Product Engine:** Deterministic mapping to Mandiri products:
  - *Schools / Universities* $\rightarrow$ Tabungan SimPel, Payroll, & Livin' Campus Acquisition
  - *Factories / Industrial* $\rightarrow$ Payroll Mandiri & Corporate Cash Management (KOPRA)
  - *Retail / Cafes / Markets* $\rightarrow$ Livin' Merchant & EDC Mandiri (QRIS / POS)
- 🕷️ **Two-Tier ScrapeGraphAI Enrichment:**
  - `SmartScraperGraph`: Deep crawl on official entity websites.
  - `SearchGraph`: Public Indonesian web & local news crawl fallback.
  - **Gemini 2.0 Flash** synthesis generating factual signals (headcount, payment methods) and conversational *Bahasa Indonesia* pitch scripts.
- 📱 **Tactile Field Dossier Drawer:** Slide-over detail drawer (`LeadDetailDrawer`) with instant 1-click WhatsApp web link (`628...` sanitized) and copyable pitch scripts.
- 💾 **Dual Database Engine:** Serverless-ready Neon PostgreSQL (`DATABASE_URL`) with connection pooling and local SQLite development fallback.
- 📊 **1-Click Field Export:** Download ranked leads with full contact info, matched products, and sales scripts as CSV.
- 🛠️ **Unified Agent Skills:** Dedicated `/develop`, `/fix`, and `/enhance` pipelines with automated testing, commit, and push.

---

## Quick Start (Local Development)

### Prerequisites
- Node 20+, Python 3.11+, npm, pip

### Frontend (Next.js 16)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
# → http://localhost:8000/docs (Swagger)
```

**Set `frontend/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Architecture

### Frontend
- **Framework:** Next.js 16 (App Router with Turbopack)
- **UI:** Leaflet.js map, Tailwind CSS, Lucide icons, Geist fonts
- **Components:**
  - `RadarWorkspace.tsx` — Main field intelligence workspace (branch select, dynamic radius slider, live health indicator)
  - `RadarMap.tsx` — Leaflet map with custom category SVG DivIcons & interactive radial scan circle
  - `LeadDetailDrawer.tsx` — Tactile slide-over dossier with copyable Indonesian pitch scripts & WhatsApp direct chat
  
- **API Integration:**
  - `GET /api/health` — Backend health check
  - `GET /api/branches` — Preset Mandiri branch locations with on-demand auto-seed
  - `POST /api/discover` — Google Places API (New) nearby search with geofence guard
  - `POST /api/leads/enrich` — ScrapeGraphAI two-tier web crawling + Gemini pitch script synthesis
  - `PATCH /api/leads/{id}/status` — Validated status lifecycle (`New` → `Contacted` → `Visit Scheduled` → `Won`/`Dropped`)
  - `GET /api/leads/export` — Downloadable streaming CSV field export

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** Neon PostgreSQL (production) with connection pooling (`pool_pre_ping`) / SQLite (local dev)
- **Core Modules:**
  - `app/config.py` — Settings & environment variables
  - `app/database.py` — SQLModel engine with automatic `postgres://` to `postgresql://` normalization
  - `app/models.py` — SQLModel tables: `BranchPreset`, `Lead`, `LeadEnrichment`
  - `app/services/scraper.py` — ScrapeGraphAI integration (`SearchGraph` & `SmartScraperGraph`)
  - `app/services/product_matching.py` — Deterministic Mandiri product mapping engine
  - `app/routers/discover.py` — Google Places API (New) & Jabodetabek boundary guard
  - `app/routers/leads.py` — ScrapeGraphAI enrichment, status lifecycle, and CSV export
  - `tests/test_api.py` — Automated regression test suite (8/8 passing)

**Key Features:**
- ✅ Hyperlocal discovery (5–25 km radius)
- ✅ Deterministic product matching (6 Mandiri product rules)
- ✅ Lead status tracking (New/Contacted/Visit Scheduled/Won/Dropped)
- ✅ CSV export with Bahasa Indonesia pitch script stubs

---

## Deployment to Vercel (Development)

### 1. Create Vercel Projects
```bash
cd frontend && vercel link  # Create/link frontend project
cd backend && vercel link   # Create/link backend project
```

### 2. Add GitHub Secrets
In **GitHub Settings → Secrets and variables → Actions**, add:
- `VERCEL_TOKEN` — From https://vercel.com/account/tokens
- `VERCEL_ORG_ID` — From `.vercel/project.json` (frontend)
- `VERCEL_PROJECT_ID` — Frontend project ID
- `VERCEL_BACKEND_PROJECT_ID` — Backend project ID (optional)

### 3. Environment Variables
**Frontend (Vercel dashboard):**
```env
NEXT_PUBLIC_API_URL=https://[backend-project].vercel.app
```

**Backend (Vercel dashboard):**
```env
DATABASE_URL=postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_PLACES_API_KEY=AIzaSy...
FRONTEND_ORIGIN=https://frontend-en92sazwe-raihan-romzi-rs-projects.vercel.app
```

### 4. Push & Deploy
```bash
git add .
git commit -m "feat: MVP ready for Vercel"
git push origin main
```

**Watch at:** GitHub Actions → `CI/CD → Deploy to Vercel (Development)`

---

## Workflow

**Typical User Session:**

1. **Select Branch:** Dropdown picks a Mandiri branch preset (default: KC Jakarta Thamrin)
2. **Set Radius:** Slider adjusts search radius (1–25 km, default 10)
3. **Click "Scan":** Discovers leads in radius
4. **Review Table:** Shows leads with:
   - Name, category, address, phone, website
   - Matched Mandiri product (badge: navy+gold)
   - Fit score (0–100, color-coded)
   - Current status
5. **Change Status:** Dropdown updates status → persists to DB
6. **Select & Enrich:** (Ticket 4 stub) Select leads, click "Deep-Dive Enrich" → ScrapeGraphAI extracts signals + generates Indonesian pitch scripts
7. **Export CSV:** 1-click download with all data + scripts

---

## Data Model

### BranchPreset
```python
id: int
name: str           # "KC Jakarta Thamrin"
code: str           # "JKT-THR"
latitude: float     # -6.1930
longitude: float    # 106.8237
city: str           # "Jakarta"
```

### Lead
```python
id: int
place_id: str       # Google Places ID or mock_1, mock_2, ...
name: str
category: str       # "school", "cafe", "factory", ...
address: str
latitude: float
longitude: float
phone_number: str
website: str
recommended_product: str    # "Tabungan SimPel & Payroll Mandiri"
pitch_angle: str            # "Kepala Sekolah / Bendahara"
fit_score: int              # 0–100
lead_status: str            # "New", "Contacted", "Visit Scheduled", "Won", "Dropped"
created_at: datetime
```

### LeadEnrichment
```python
id: int
lead_id: int        # FK → Lead
raw_scraped_summary: str
employee_or_student_count: int
current_payment_methods: str
pitch_script_wa: str            # WhatsApp-safe pitch (Bahasa Indonesia)
pitch_script_visit: str         # In-person visit pitch (Bahasa Indonesia)
enriched_at: datetime
```

---

## CI/CD Pipeline

**File:** `.github/workflows/deploy.yml`

| Job | Trigger | Actions |
|-----|---------|---------|
| `frontend-ci` | Push/PR to main | npm ci → type-check → lint → build |
| `backend-ci` | Push/PR to main | pip install → py_compile → product_matching test |
| `deploy-frontend` | Push to main (after CI) | vercel build → vercel deploy --prebuilt |
| `deploy-backend` | Push to main (after CI) | vercel build → vercel deploy --prebuilt |

**Result:** Auto-deploys to Vercel Dev on every push to `main` (after checks pass).

---

## Feature Roadmap & Status

| Feature | Scope / Ticket | Status | Technology |
|---|---|---|---|
| **Hyperlocal Map & Radar** | Ticket 1 & 2 | ✅ Shipped | Leaflet + Custom SVG DivIcons + Radial Visualizer |
| **Google Places Discovery** | Ticket 2 | ✅ Shipped | Google Places API (New) + Jabodetabek Boundary Guard |
| **Mandiri Product Matching** | Ticket 3 | ✅ Shipped | Rule-Gated Engine (SimPel, Payroll, Livin' Merchant, EDC, KOPRA) |
| **ScrapeGraphAI Web Crawling** | Ticket 4 | ✅ Shipped | `SmartScraperGraph` + `SearchGraph` (Gemini 2.0 Flash Backbone) |
| **Lead Pipeline & CSV Export** | Ticket 5 | ✅ Shipped | Lifecycle State Machine + 1-Click Streaming CSV Export |
| **PostgreSQL Database** | Infra | ✅ Shipped | Neon PostgreSQL (`DATABASE_URL`) with Pool Pre-Ping |
| **Tactile Dossier Drawer** | UX | ✅ Shipped | `LeadDetailDrawer` with Sanitized WhatsApp Direct Chat (`628...`) |
| **Automated Regression Suite** | Quality | ✅ Shipped | Python `unittest` (8/8 API test cases passing) |
| **Unified Operating Skills** | Tooling | ✅ Shipped | `/develop`, `/fix`, `/enhance` with automated Git delivery |

---

## Troubleshooting

### "Cannot reach backend" (CORS error)
→ Check `NEXT_PUBLIC_API_URL` matches actual backend Vercel URL.

### "Database lost on deploy"
→ Expected with SQLite on ephemeral Vercel filesystem. For production, switch to Neon Postgres.

### "Vercel deploy failed: permission denied"
→ Regenerate `VERCEL_TOKEN` at https://vercel.com/account/tokens.

---

## Documentation

- **[PRD.md](docs/PRD.md)** — Product requirements, user flow, FRs, tech stack
- **[MVP-PLAN.md](docs/MVP-PLAN.md)** — Detailed ticket breakdown (Tickets 2–5)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Vercel setup guide (GitHub secrets, env vars)
- **[progress.md](docs/progress.md)** — Ticket checklist and completed work

---

## Deployment Links

- 🌐 **Frontend (Live):** [https://frontend-en92sazwe-raihan-romzi-rs-projects.vercel.app](https://frontend-en92sazwe-raihan-romzi-rs-projects.vercel.app)
- ⚙️ **Backend API & Swagger (Live):** [https://backend-three-pi-11.vercel.app/docs](https://backend-three-pi-11.vercel.app/docs)

---

## Team

**Role:** Principal MVP Product Architect + Full-Stack Builder  
**Goal:** Validate core user value + ship working MVP with zero bloat

---

## Support

- **GitHub:** [bftm-ai-leading-finder-system](https://github.com/[your-org]/bftm-ai-leading-finder-system)
- **Vercel:** [Vercel Dashboard](https://vercel.com/dashboard)
- **Docs:** Vercel, Next.js, FastAPI, SQLModel

