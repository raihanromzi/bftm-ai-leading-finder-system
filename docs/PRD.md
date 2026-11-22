# PRD: BFTM AI Lead Finder & Product-Matching Radar (MVP)

## 1. Problem & Target User
- **Target User:** Branch Funding Transaction Managers (BFTMs) and sales officers at Bank Mandiri branch offices across Indonesia.
- **Core Pain:** BFTMs must aggressively acquire fresh CASA, payroll, retail merchants, and student retail users within their branch operating territory (default 10 km radius). Currently, they rely on manual foot patrols or scattered web searches, lacking a structured radar that detects nearby commercial/educational entities, qualifies their financial size, and maps them to concrete Mandiri acquisition products.
- **Success Metric (v1):** A BFTM can drop a branch pin, discover 30+ verified entities within 10 km in < 3 seconds, deep-enrich a selected batch with ScrapeGraphAI signals in < 60 seconds, and export a ranked field-visit list with customized Indonesian pitch scripts to CSV in under 2 minutes.

## 2. Core User Flow (Happy Path)
1. **Branch Location & Radius Entry:** The officer opens the workspace, selects a preset Mandiri branch (or searches/clicks a pin on an interactive Indonesian map), and configures the focused search radius (default: 3 km, slider 1–5 km for deep hyperlocal density).
2. **Hyperlocal Discovery Scan:** The officer clicks "Scan Radar". The backend queries Google Places API to discover commercial, institutional, and retail POIs (schools, factories, UMKM, coffee shops, convenience stores near universities). The leads populate the map markers and a ranked filterable table instantly with basic metadata and deterministic product match tags.
3. **Targeted AI Enrichment (ScrapeGraphAI):** The officer inspects the leads, selects high-value targets (individual or batch top-5/10), and clicks "Deep-Dive Enrich". ScrapeGraphAI executes a hybrid crawl (direct website SmartScraperGraph if URL exists, or SearchGraph fallback on `"[Entity Name] [Kecamatan/Kota]"`) extracting student/employee count, current payment channels, and local news signals.
4. **Product Match & Indonesian Pitch Scripting:** The engine refines the product fit score and generates a personalized *Bahasa Indonesia formal-santun* sales pitch script (tailored for WhatsApp or in-person branch visits) citing the discovered signals.
5. **Pipeline Action & Export:** The officer tracks engagement status (`New`, `Contacted`, `Visit Scheduled`, `Won`, `Dropped`) and downloads a 1-click CSV ready for field execution.

## 3. MVP Functional Requirements (In-Scope)
- **[FR-1] Interactive Branch Map & Radius Control:** 
  - Interactive Leaflet.js map centered on Indonesia (with default presets like KC Jakarta Thamrin, KCP Bandung Dago, KC Surabaya Basuki Rahmat, etc.).
  - Draggable pin / coordinate click with dynamic circular radius visualizer (1 km to 5 km slider, default 3 km).
- **[FR-2] Hyperlocal Deep Ecosystem Discovery Engine (Google Places API):**
  - Backend integration with Google Places API (Nearby Search with `POPULARITY` ranking and 4 parallel category buckets) targeting high-density ecosystems:
    - *Campuses & Schools:* `university`, `college`, `school`, `primary_school`, `secondary_school`
    - *Merchant Ecosystem (F&B / Coffee):* `cafe`, `coffee_shop`, `restaurant`, `bakery`, `fast_food_restaurant`
    - *Daily Retail & Convenience Chains:* `convenience_store` (Indomaret, Alfamart, FamilyMart), `supermarket`, `grocery_store`, `shopping_mall`
    - *Corporate & Industrial:* `corporate_office`, `manufacturer`
  - Returns place name, address, latitude/longitude, category, phone number, and official website URI.
- **[FR-3] Two-Tier ScrapeGraphAI Enrichment Engine:**
  - Fast-path discovery returns raw places in ~2s.
  - On-demand "Deep-Dive Enrich" triggered per lead or in batches.
  - Hybrid scraper pipeline:
    - *Path A (Website available):* `SmartScraperGraph` crawls the place website for entity details (headcount, accreditation, business scale, current payment terms).
    - *Path B (No website):* `SearchGraph` executes a web search query `"{place_name} {district/city}"` to retrieve recent local news, social media footprint, and size indicators.
  - Configurable LLM provider (`OpenAI gpt-4o-mini` or `Google Gemini 1.5 Flash` via `.env`).
- **[FR-4] Bank Mandiri Rule-Gated Product Engine & Pitch Generator:**
  - Deterministic banking product mapping:
    - *K-12 Schools (SD/SMP/SMA):* Tabungan SimPel (students) + Rekening Payroll Mandiri (teachers/staff).
    - *Factories / Medium-Large Enterprises:* Rekening Payroll Mandiri + Corporate Cash Management (KOPRA).
    - *Retail, F&B, UMKM, Pasar:* Livin' Merchant & EDC Mandiri (QRIS & POS settlement).
    - *Universities & Campus Convenience Hubs (Indomaret, Alfamart, FamilyMart):* Gerakan Militan Mandiri (GMM) / Livin' by Mandiri student onboarding campaign.
    - *Community Hubs / Event Halls:* Livin' Acquisition Booth / Event Promo.
  - Generates conversational Bahasa Indonesia pitch scripts (WhatsApp and direct field visit versions) quoting exact extracted signals (e.g. *"Selamat pagi Ibu/Bapak Kepala Sekolah SDN 01, kami melihat sekolah memiliki lebih dari 600 siswa..."*).
- **[FR-5] Lead Management & Actionable CSV Export:**
  - Searchable, filterable lead table (filter by product, category, enrichment status, or minimum score).
  - Status lifecycle updates: `New` $\rightarrow$ `Contacted` $\rightarrow$ `Visit Scheduled` $\rightarrow$ `Won` / `Dropped`.
  - 1-Click CSV export containing: Entity Name, Category, Address, Phone, Website, Matched Product, Fit Score, Lead Status, Enriched Signals, and WhatsApp Pitch Script.

## 4. Explicit Non-Goals (Out of Scope for MVP)
- **Private Social Network Scraping:** No authenticated scraping of closed Facebook groups, private Instagram accounts, or bypass of anti-bot protections.
- **X (Twitter) Firehose:** No real-time tweet stream listening.
- **Core Banking & Internal CRM Integration:** No direct API connection to Bank Mandiri internal core-banking systems (BMS/COINS) or corporate Active Directory SSO.
- **Complex Multi-Tenant RBAC / Auth:** No user login, JWT tokens, or multi-role permissions; operates as an internal zero-auth branch workspace.
- **Automated WhatsApp Blasting:** No automated bot blasting via unofficial WhatsApp APIs to prevent phone number bans; pitch scripts are formatted for manual 1-click copy into WhatsApp Web.

## 5. Minimal Tech Stack & Data Model
- **Stack:**
  - **Frontend:** Next.js 16 (App Router with Turbopack, TypeScript, Tailwind CSS, Leaflet, Lucide Icons, Geist Sans).
  - **Backend:** FastAPI (Python 3.11+, ScrapeGraphAI 2.3.1, Google Places API client, Pydantic).
  - **Database:** Neon PostgreSQL (production) with pool pre-ping / SQLite (`bftm_radar.db`) for local dev via SQLModel.
  - **LLM/Extraction:** ScrapeGraphAI (`SearchGraph` & `SmartScraperGraph`) with Google Gemini 2.0 Flash (`langchain-google-genai`).
  - **Delivery:** Automated CI/CD to Vercel via GitHub `main` branch.
- **Core Entities / Schema:**
  - `BranchPreset`: `id`, `name`, `code`, `latitude`, `longitude`, `city`.
  - `Lead`: `id`, `place_id`, `name`, `category`, `address`, `latitude`, `longitude`, `phone_number`, `website`, `recommended_product`, `pitch_angle`, `fit_score`, `lead_status`, `created_at`.
  - `LeadEnrichment`: `id`, `lead_id`, `raw_scraped_summary`, `employee_or_student_count`, `current_payment_methods`, `pitch_script_wa`, `pitch_script_visit`, `enriched_at`.
- **Key Endpoints / Actions:**
  - `GET /api/branches` — List preset Mandiri branches and recent coordinate pins.
  - `POST /api/discover` — Input `{ latitude, longitude, radius_km, categories? }` $\rightarrow$ returns raw discovered leads with initial rule mapping.
  - `POST /api/leads/enrich` — Input `{ lead_ids: string[] }` $\rightarrow$ executes ScrapeGraphAI hybrid crawl, updates signals, and generates Indonesian pitch scripts.
  - `PATCH /api/leads/{id}/status` — Input `{ status: "New" | "Contacted" | "Visit Scheduled" | "Won" | "Dropped" }`.
  - `GET /api/leads/export` — Stream filtered leads as downloadable CSV file.
