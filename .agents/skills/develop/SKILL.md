---
name: develop
description: Unified MVP Software Development Life Cycle (SDLC) pipeline. Combines PRD reading, design specs, frontend engineering, tactile interactions, and systematic debugging into a single token-efficient workflow.
---

# Unified MVP Development Pipeline (`/develop`)

A consolidated, token-efficient Software Development Life Cycle (SDLC) engineered specifically for shipping high-craft MVPs. Instead of manually invoking disparate skills across multiple turns, `/develop` executes a single, structured 4-step pipeline that ensures consistency, zero boilerplate, and ironclad verification.

---

## The 4-Step MVP SDLC Pipeline

```
┌────────────────────────────────────────────────────────┐
│  STEP 1: Context & Specification Ingestion             │
│  (Read PRD.md + progress.md + DESIGN.md)               │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  STEP 2: Design & Aesthetic Craft                      │
│  (frontend-design + emil-design-eng + web-guidelines)  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  STEP 3: Vertical Slice Implementation                 │
│  (Database + Backend API + Interactive UI)             │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  STEP 4: Systematic Debugging & Verification Gate      │
│  (systematic-debugging + verification-before-complete) │
└────────────────────────────────────────────────────────┘
```

---

## Step 1: Context & Specification Ingestion

Always ground the task in the authoritative project documentation before touching code:

1. **Read `docs/PRD.md`:**
   - Confirm user persona (e.g., Bank Mandiri BFTM), business objectives, and out-of-scope boundaries.
   - Enforce **Strict YAGNI**: Reject any feature, abstraction, or edge case not explicitly agreed upon.
2. **Read `docs/progress.md`:**
   - Check the current active ticket, recently modified files, and any known blockers or environment requirements.
3. **Read `docs/DESIGN.md`:**
   - Check design tokens (color tokens, font hierarchy, component spacing, and spatial layout rules).
   - Ensure decisions adhere to the established visual identity.

---

## Step 2: Design & UI Engineering

Synthesizes the core principles of `frontend-design`, `emil-design-eng`, and `web-design-guidelines`:

1. **Intentional Aesthetics (`frontend-design`):**
   - Avoid generic AI templates (e.g., centered purple gradients, card grids with no hierarchy).
   - Use high-contrast, intentional typography (Geist / Inter + tabular numbers for metrics).
   - Maintain a clear primary focal point (e.g., full-canvas radar map with floating utility drawer).
2. **Tactile Micro-Interactions (`emil-design-eng`):**
   - **Press feedback:** Active states feel physical (`scale(0.97)` or `active:scale-95`).
   - **Isolated loading:** Never trigger global loading spinners; isolate spinners to the exact item being processed (e.g., `Set<number>` for lead IDs).
   - **Physics & Transitions:** Use fluid easing for drawers and slide-overs (`--ease-drawer`), and keep range sliders dynamically synced with thumb positions.
   - **Crisp boundaries:** 1px hairline borders (`rgba(15, 23, 42, 0.08)`) with subtle layer separation.
3. **Accessibility & Web Guidelines (`web-design-guidelines`):**
   - High contrast text (`#0F172A` on `#FFFFFF` / `#F8FAFC`).
   - Focus rings on interactive elements for keyboard navigation.
   - Dynamic status announcements (`aria-live="polite"`).
   - Respect `prefers-reduced-motion`.

---

## Step 3: Vertical Slice Implementation

Deliver end-to-end working slices rather than isolated layers:

1. **Database Layer:**
   - SQLModel schemas with clean indexes and foreign keys.
   - Dual compatibility: PostgreSQL (Neon / Supabase with connection pooling) and local SQLite fallback.
2. **API & Service Layer:**
   - FastAPI routers with Pydantic validation.
   - Geofence and boundary guards.
   - Real-world service integration (e.g., ScrapeGraphAI with graceful fallbacks).
3. **Frontend Presentation Layer:**
   - Next.js (App Router) + Tailwind CSS + Lucide icons.
   - Single clear call-to-action per item (e.g., consolidated "Lihat Detail" pattern).
   - Real-time reactivity and optimistic updates where appropriate.

---

## Step 4: Systematic Debugging & Quality Gate

Never mark a task complete or push changes without empirical verification:

1. **Systematic Debugging (`systematic-debugging`):**
   - **Phase 1 (Root Cause):** Read stack traces completely, inspect data flow across component boundaries, and reproduce before attempting fixes.
   - **Phase 2 (Pattern Analysis):** Compare broken code against working references.
   - **Phase 3 (Hypothesis Testing):** Make minimal, single-variable tests.
   - **Phase 4 (Root Fix):** Fix the source, never patch symptoms.
2. **Verification Before Completion (`verification-before-completion`):**
   - Execute backend automated test suite: `python -m unittest tests/test_api.py`.
   - Execute frontend TypeScript check: `npm run type-check`.
   - Execute frontend production build: `npm run build`.
   - Confirm: **0 errors, 0 deprecation warnings**.
3. **Handoff Documentation:**
   - Update `docs/progress.md` with:
     1. Completed slice and modified file paths.
     2. Status of tests and verification evidence.
     3. Exact next ticket to execute.
4. **Automated Git Commit & Push:**
   - Stage verified files: `git add <files>`
   - Commit with a semantic message: `git commit -m "feat(<scope>): <description>"`
   - Push immediately: `git push origin main`
   - Confirm push was successful so Vercel automated deployment triggers immediately.
