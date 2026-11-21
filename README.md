# BFTM Radar — Hyperlocal Lead Finder for Bank Mandiri

**MVP Status:** ✅ **Ready to Deploy**

A web-based tool for Bank Mandiri Branch Funding Transaction Managers (BFTMs) to discover, qualify, and engage nearby commercial and educational entities for financial product acquisition.

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
- **Framework:** Next.js 16 (App Router)
- **UI:** Leaflet.js map + React, Tailwind CSS, Lucide icons
- **Components:**
  - `RadarWorkspace.tsx` — Main workspace (branch selector + radius + controls)
  - `RadarMap.tsx` — Leaflet map of Indonesia with branch presets + lead markers
  - `LeadsTable.tsx` — Sortable, selectable leads table with status dropdown
  
- **API Integration:**
  - `GET /api/health` — Backend health check
  - `GET /api/branches` — Preset branch locations (8 presets: Jakarta, Bandung, Surabaya, etc.)
  - `POST /api/discover` — Discover nearby leads (latitude, longitude, radius_km)
  - `PATCH /api/leads/{id}/status` — Update lead status (New → Contacted → Visit Scheduled → Won/Dropped)
  - `GET /api/leads/export` — Stream CSV export

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** SQLite (dev) / Neon Postgres (prod)
- **Core Modules:**
  - `app/config.py` — Environment variables
  - `app/database.py` — SQLModel + SQLAlchemy engine
  - `app/models.py` — Data schema: `BranchPreset`, `Lead`, `LeadEnrichment`
  - `app/services/product_matching.py` — 6-rule keyword engine (school→85%, cafe→70%, default→50%)
  - `app/routers/health.py` — Health check endpoint
  - `app/routers/branches.py` — Branch presets + seed data
  - `app/routers/discover.py` — `POST /api/discover` with mock Google Places data
  - `app/routers/leads.py` — Status updates, list leads, CSV export

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
GOOGLE_PLACES_API_KEY=                  # Leave blank for MVP (mock data)
OPENAI_API_KEY=                         # Leave blank for MVP
FRONTEND_ORIGIN=https://[frontend].vercel.app
DATABASE_URL=sqlite:///./bftm_radar.db
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

## Post-MVP Roadmap

| Feature | Ticket | Status | Blocker |
|---------|--------|--------|---------|
| Mock discovery | Ticket 2 | ✅ Done | — |
| Product matching | Ticket 3 | ✅ Done | — |
| Lead pipeline + export | Ticket 5 | ✅ Done | — |
| **ScrapeGraphAI enrichment** | Ticket 4 | 🟡 Stub | Need OpenAI API key |
| **Google Places API** | Ticket 2 | 🟡 Fallback mock | Need Google Places API key |
| **Postgres database** | Infra | 🔲 Not started | Need Neon Postgres link |
| **User authentication** | Auth | 🔲 Not started | Need Clerk/Auth0 |
| **WhatsApp integration** | Ticket 4 | 🔲 Not started | Manual copy-paste only (MVP) |
| **Multi-language** | UX | 🔲 Not started | Indonesian (Bahasa) only (MVP) |

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

**After first Vercel deploy:**
- **Frontend:** https://[your-frontend-project].vercel.app
- **Backend:** https://[your-backend-project].vercel.app/docs (Swagger)

---

## Team

**Role:** Principal MVP Product Architect + Full-Stack Builder  
**Goal:** Validate core user value + ship working MVP with zero bloat

---

## Support

- **GitHub:** [bftm-ai-leading-finder-system](https://github.com/[your-org]/bftm-ai-leading-finder-system)
- **Vercel:** [Vercel Dashboard](https://vercel.com/dashboard)
- **Docs:** Vercel, Next.js, FastAPI, SQLModel

