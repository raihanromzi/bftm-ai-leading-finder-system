# MVP Build Progress — SHIPPED & REVAMPED ✅

## Summary
All 5 MVP tickets + post-MVP hardening completed and verified.
Frontend UI follows tactile field-intelligence desk direction with single "Lihat Detail" flow per card and granular loading states.
Backend features real ScrapeGraphAI web scraping (`SearchGraph` + `SmartScraperGraph`) grounded with Gemini, plus dual-engine database support (Neon PostgreSQL / SQLite).

**Live URLs:**
- **Frontend:** https://frontend-en92sazwe-raihan-romzi-rs-projects.vercel.app
- **Backend:** https://backend-three-pi-11.vercel.app

All endpoints and client features functional and verified:
- Health check: ✅ Live radar status pill with animated indicator
- Branch presets: ✅ 8 Mandiri branch presets + dynamic coordinate updates
- Discovery: ✅ Google Places API (New) ready with Jabodetabek regional boundary enforcement
- Enrichment: ✅ ScrapeGraphAI real web crawl + Gemini synthesis + pitch script generation (Bahasa Indonesia)
- Database: ✅ Neon PostgreSQL (`DATABASE_URL`) connection pool + SQLite local fallback
- Status updates: ✅ Validated lifecycle (New/Contacted/Visit Scheduled/Won/Dropped)
- CSV export: ✅ 1-click formatted field-visit export
- UI/UX Craft: ✅ Single "Lihat Detail" drawer entry point, per-lead loading state, zero build warnings

## Completed Slices
- [x] **Enhancement: Location Search & Google Maps Export**
- Location search: free-text place lookup via OpenStreetMap Nominatim (no API key), 5 Indonesian-locale suggestions, picking one recenters the radar and auto-scans nearest leads in that area.
- Backend: new `POST /api/geocode/search` router (`backend/app/routers/geocode.py`) with query validation (2–200 chars) and 502 on upstream failure.
- Google Maps export: header now offers two actions — open up to 8 visible leads as a Google Maps multi-stop driving route, and download a Google My Maps-compatible CSV (`Name, Address, Latitude, Longitude, Product, Notes`) of the full visible list.
- Added regression test `test_10_location_search` (search "Monas Jakarta" returns coordinates inside Jabodetabek; short query rejected 422).
- *Modified Files:*
  - `backend/app/routers/geocode.py` (new)
  - `backend/main.py`
  - `backend/tests/test_api.py`
  - `frontend/src/components/RadarWorkspace.tsx`
  - `frontend/src/app/globals.css`
  - `README.md`
  - `docs/PRD.md`
  - `docs/progress.md`
- *Acceptance Check:*
  - Backend automated regression suite: 10/10 tests PASSED (0 errors)
  - Frontend `npm run type-check`: PASSED (0 errors)
  - Frontend `npm run build`: PASSED (0 errors)
- *Next Ticket:* Manual verification of location search + Google Maps route/CSV export on the deployed frontend.

- [x] **Bug Fix: Revert Default Map Styling to Vibrant Full-Color OpenStreetMap**
  - Reverted default map canvas from desaturated minimalist filter back to vibrant, natural full-color OpenStreetMap view (`standar` / `Berwarna`).
  - Restored clear visual differentiation for parks (green), water bodies (blue), arterial roads (orange/yellow), and residential districts with zero API key requirement.
  - Retained floating 4-theme switcher pill (`Berwarna`, `Modern`, `Minimalis`, `Gelap`) so officers can switch views on-demand without reloading tile assets.
  - Updated `localStorage` migration so existing sessions automatically default to `standar` (Berwarna).
  - *Modified Files:*
    - `frontend/src/components/RadarMap.tsx`
    - `README.md`
    - `docs/PRD.md`
    - `docs/MVP-PLAN.md`
    - `docs/progress.md`

- [x] **Enhancement: Building Tenant Unbundling & Office Directory Intelligence**
  - Resolved the limitation where scanning commercial areas returned generic office towers (e.g. "RDTX Tower") rather than the actual companies operating inside.
  - Implemented Building Tenant Unbundling across the full stack:
    1. **Targeted SearchGraph Prompt:** Detects office towers/buildings (`is_office_building`) and queries public web/business directories specifically for `daftar perusahaan, kantor PT, dan tenant bisnis di gedung {name}`.
    2. **Gemini Structured Tenant Extraction:** Parses building occupants into structured tenant objects: `name`, `industry`, `floor`, `employee_estimate`, and `product` (e.g. Payroll Mandiri, KOPRA).
    3. **Tactile Tenant Directory UI (`LeadDetailDrawer.tsx`):**
       - Displays a dedicated "Bedah Tenant & Kantor Gedung" card for office buildings.
       - Each tenant item features industry/floor metadata, target Mandiri product, and a 1-click **"Targetkan"** button.
       - Selecting a tenant instantly tailors the WhatsApp and Visit sales pitch to that specific company's HR/Finance management.
       - Added dedicated **"Pengelola Gedung"** pitch tab to pitch Building Management for hosting *Mandiri Banking Days / Onsite Pop-Up Booths* in the lobby.
    4. **Discovery & Mock Enhancements:** Expanded Places search bucket to include `consultant`, `financial_institution`, and `coworking_space`, and added `RDTX Tower (Mega Kuningan)` to lead mock templates.
    5. **CSV Export:** Updated export to include the `Tenants / Kantor Gedung` column.
  - *Modified Files:*
    - `backend/app/services/scraper.py`
    - `backend/app/routers/discover.py`
    - `backend/app/routers/leads.py`
    - `backend/tests/test_api.py`
    - `frontend/src/components/LeadDetailDrawer.tsx`
    - `frontend/src/components/RadarWorkspace.tsx`
    - `frontend/src/app/lead-drawer.css`
    - `README.md`
    - `docs/PRD.md`
    - `docs/MVP-PLAN.md`
    - `docs/progress.md`

- [x] **Bug Fix: Retain Active POIs on Micro-Shifts & Spatial Token-Saving Threshold**
  - Resolved issue where clicking the map to adjust coordinates immediately purged all leads (`setLeads([])`) and triggered an unthrottled API discovery request.
  - Implemented smart spatial cache threshold (`calculateDistanceKm`):
    - Micro-shifts within the active area (< 600m from `scannedCenter`): retains existing leads and markers, updates center/radius smoothly, and bypasses redundant `/api/discover` calls to save API tokens and quota.
    - Added user feedback notice (`.radar-control-notice`): informs user that prospek are preserved and tokens saved, while keeping the "Pindai wilayah" button available for explicit re-scans.
    - Macro-relocations (> 600m): retains previous leads during loading to eliminate jarring empty screen flashes before new leads arrive.
  - *Modified Files:*
    - `frontend/src/components/RadarWorkspace.tsx`
    - `frontend/src/app/globals.css`
    - `docs/progress.md`

- [x] **Enhancement: Zero-Key Minimalist Map Canvas & GPU-Filtered 4-Theme Switcher**
  - Replaced third-party raster tile dependencies (such as CartoDB which recently imposed "API KEY REQUIRED" watermarks) with rock-solid, zero-key **OpenStreetMap** base tiles combined with GPU-accelerated CSS filter modes.
  - Added tactile floating theme switcher pill (`Layers` icon + 4 segment buttons):
    1. **Minimalis (Default):** High-clarity desaturated monochrome gray tones (`grayscale(90%) contrast(92%) brightness(106%)`) stripping garish yellow/orange road clutter so POI pins and radar radius pop out cleanly with zero watermarks.
    2. **Modern:** Relaxed pastel tones (`saturate(0.55) contrast(98%) brightness(102%)`) offering an Apple-Maps style softness.
    3. **Gelap:** Tactical night radar aesthetic (`invert(100%) hue-rotate(180deg) brightness(92%) contrast(88%)`) with deep navy background and illuminated sky-blue radius circle (`#38bdf8`).
    4. **Standar:** Original full-color OpenStreetMap street view.
  - Zero API key required, zero external quota limits, 0ms instant theme switching without re-downloading tile images.
  - Persisted theme selection across browser sessions via `localStorage` with backward compatibility for legacy keys.
  - Responsive design with smooth transitions (`220ms cubic-bezier(.16, 1, .3, 1)`).
  - Fully synchronized docs: `README.md`, `docs/PRD.md`, `docs/MVP-PLAN.md`, and `docs/progress.md`.
  - *Modified Files:*
    - `frontend/src/components/RadarMap.tsx`
    - `frontend/src/app/globals.css`
    - `README.md`
    - `docs/PRD.md`
    - `docs/MVP-PLAN.md`
    - `docs/progress.md`

- [x] **Enhancement: Sole Branch Base (KC Jakarta Wisma Danantara) & Tactile Identity Card**
  - Consolidated branch presets to a single dedicated home base: **Bank Mandiri KC Jakarta Wisma Danantara** (`JKT-DANANTARA`, lat `-6.2249`, lng `106.8145`) inside Wisma Danantara Indonesia (formerly Plaza Mandiri / Plaza Exim), Jl. Jend. Gatot Subroto Kav. 36–38, Jakarta Selatan.
  - Replaced the single-option `<select>` dropdown with an intentional, tactile **Branch Identity Card** featuring branch metadata, operational context, and an automated "Reset ke Cabang" pill button when the officer navigates/clicks outside the home base.
  - Updated auto-seed routine in `backend/app/seed_branches.py` and `backend/app/routers/branches.py` to auto-clean legacy branch presets on cold start.
  - Updated regression test suite `tests/test_api.py` asserting sole branch preset and updated Jabodetabek scan coordinates to Danantara.
  - Fully synchronized docs: `README.md`, `docs/PRD.md`, `docs/MVP-PLAN.md`, and `docs/progress.md`.
  - *Modified Files:*
    - `backend/app/seed_branches.py`
    - `backend/app/routers/branches.py`
    - `backend/tests/test_api.py`
    - `frontend/src/app/globals.css`
    - `frontend/src/components/RadarWorkspace.tsx`
    - `README.md`
    - `docs/PRD.md`
    - `docs/MVP-PLAN.md`
    - `docs/progress.md`

- [x] **Enhancement: Focused Hyperlocal Radius (1–5 km) & Deep Campus/Merchant Ecosystem Mapping**
  - Tightened radius focus to 1–5 km (default 3 km) with exact slider track sync `((radius - 1) / 4) * 100%`.
  - Upgraded Google Places discovery to 4 deep parallel buckets (`max_count=12` each) with `POPULARITY` ranking:
    1. Higher Education & Schools (`university`, `college`, `school`)
    2. Campus & Neighborhood F&B / Coffee Hubs (`cafe`, `coffee_shop`, `restaurant`, `bakery`, `fast_food_restaurant`)
    3. Daily Retail Chains & Outlets (`convenience_store` - Indomaret/Alfamart/FamilyMart, `supermarket`, `grocery_store`)
    4. Corporate & Industrial Workplaces (`corporate_office`, `manufacturer`)
  - Updated category normalization in `discover.py` so `coffee_shop`, `fast_food`, and `grocery_store` map directly to high-fit Mandiri products.
  - Expanded mock lead templates to 10 rich campus/community ecosystem leads.
  - Updated Pydantic validation: `radius_km: int = Field(ge=1, le=5)`.
  - Added test case validating rejection of radius > 5 km.
  - Synchronized documentation across `README.md`, `docs/PRD.md`, `docs/MVP-PLAN.md`, and `docs/progress.md`.
  - *Modified Files:*
    - `backend/app/routers/discover.py`
    - `backend/tests/test_api.py`
    - `frontend/src/components/RadarWorkspace.tsx`
    - `frontend/src/app/globals.css`
    - `README.md`
    - `docs/PRD.md`
    - `docs/MVP-PLAN.md`
    - `docs/progress.md`
  - *Acceptance Check:*
    - Backend automated regression suite: 8/8 tests PASSED (0 errors, 0 warnings)
    - Frontend `npm run type-check`: PASSED (0 errors)
    - Frontend `npm run build`: PASSED (0 errors, 0 warnings)

- [x] **Post-MVP Hardening, Range Slider Fix & Unified Skills**
  - Integrated real ScrapeGraphAI (`SearchGraph` & `SmartScraperGraph`) with Gemini 2.0 Flash backbone and BeautifulSoup HTTP fallback.
  - Added PostgreSQL support (`psycopg2-binary`, pool pre-ping, URL scheme normalization for Neon/Supabase).
  - Consolidated card actions into a single "Lihat Detail" button with dedicated in-drawer "AI Deep-Dive".
  - Fixed multi-card loading bug by migrating from global boolean to granular `Set<number>` lead ID tracking.
  - Fixed range slider WebKit track fill bug: replaced hardcoded 37% CSS gradient with dynamic `--slider-fill` CSS variable synced to the thumb.
  - Sanitized WhatsApp URL generation for Indonesian phone numbers (`08...` -> `628...`).
  - Added on-demand auto-seed for branches in case of cold-start lifespan bypass.
  - Resolved Next.js 16 `themeColor` deprecation warning using `generateViewport()`.
  - Added automated backend regression test suite (`backend/tests/test_api.py`) with 8/8 tests passing.
  - Built unified execution skills (`.agents/skills/develop`, `.agents/skills/fix`, `.agents/skills/enhance`) with mandatory automated commit & push delivery.
  - Fully synchronized all documentation: `README.md`, `docs/PRD.md`, `docs/MVP-PLAN.md`, and `docs/progress.md`.
  - *Modified/Created Files:*
    - `.agents/skills/develop/SKILL.md` (new)
    - `.agents/skills/fix/SKILL.md` (new)
    - `.agents/skills/enhance/SKILL.md` (new)
    - `backend/app/services/scraper.py` (new)
    - `backend/tests/test_api.py` (new)
    - `backend/app/routers/leads.py`
    - `backend/app/routers/branches.py`
    - `backend/app/database.py`
    - `backend/app/config.py`
    - `backend/requirements.txt`
    - `frontend/src/app/globals.css`
    - `frontend/src/app/layout.tsx`
    - `frontend/src/components/LeadDetailDrawer.tsx`
    - `frontend/src/components/RadarWorkspace.tsx`
    - `README.md`
    - `docs/PRD.md`
    - `docs/MVP-PLAN.md`
    - `docs/progress.md`
    - `AGENTS.md`
  - *Acceptance Check:*
    - Backend automated regression suite: 8/8 tests PASSED (0 errors, 0 warnings)
    - Frontend `npm run type-check`: PASSED (0 errors)
    - Frontend `npm run build`: PASSED (0 errors, 0 warnings)
  - *Acceptance Check:*
    - Backend automated regression suite: 8/8 tests PASSED (0 errors, 0 warnings)
    - Frontend `npm run type-check`: PASSED (0 errors)
    - Frontend `npm run build`: PASSED (0 errors, 0 warnings)

- [x] **Frontend UI Redesign (Field Intelligence Desk)**
- Replaced Apple/frosted-glass styling with tactile field-intelligence direction: evergreen workbench, paper ledger, coral scan signal, branch-map hierarchy.
- Preserved MVP interactions: radar scan, radius and branch selection, map relocation, filters, export, enrichment, lead status, and drawer actions.
- Retained press feedback (`scale(.97)`), `--ease-drawer` motion, keyboard focus, and reduced-motion support.
- *Modified Files:*
  - `frontend/src/app/globals.css`
  - `frontend/src/components/LeadDetailDrawer.tsx`
  - `frontend/src/components/LeadsTable.tsx`
  - `frontend/src/components/RadarWorkspace.tsx`
  - `docs/progress.md`
- *Acceptance Check:* `npm run type-check` and `npm run build` pass 0 errors.

- [x] **PRD & Architecture Locked** — [PRD.md](file:///Users/raihanromzi/Documents/Development/bftm-ai-leading-finder-system/docs/PRD.md).
- [x] **Ticket 1: Project Scaffold & Tracer Bullet**
- [x] **Ticket 2: Hyperlocal Discovery Engine (Google Places & Map Pin)**
- [x] **Ticket 3: Bank Mandiri Rule-Gated Product Engine**
- [x] **Ticket 4: ScrapeGraphAI Two-Tier Enrichment & Pitch Generator**
- [x] **Ticket 5: Lead Pipeline Management & CSV Field Export**

