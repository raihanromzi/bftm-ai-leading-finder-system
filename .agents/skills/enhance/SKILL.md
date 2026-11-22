---
name: enhance
description: Feature refinement and documentation synchronization pipeline. Enhances existing features without breaking architectural patterns, updates README.md, and synchronizes all project docs (docs/PRD.md, docs/MVP-PLAN.md, docs/progress.md).
---

# Feature Enhancement & Documentation Sync Pipeline (`/enhance`)

Use `/enhance` to polish or extend **existing** features, optimize UX/performance, and guarantee that code changes are immediately synchronized across all project documentation (`README.md`, `docs/PRD.md`, `docs/MVP-PLAN.md`, and `docs/progress.md`).

---

## The 4-Step Enhancement & Sync Protocol

```
┌────────────────────────────────────────────────────────┐
│  PHASE 1: Existing Feature Polish / Refinement         │
│  (Enhance UX, performance, or capability cleanly)      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  PHASE 2: Verification Gate                            │
│  (Backend tests + Frontend typecheck + Build)          │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  PHASE 3: Full Documentation Synchronization           │
│  (README.md + PRD.md + MVP-PLAN.md + progress.md)      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  PHASE 4: Summary & Git Handoff                        │
│  (Review diffs, zero out-of-sync documentation)        │
└────────────────────────────────────────────────────────┘
```

---

## Phase 1: Existing Feature Polish / Refinement

When enhancing an existing capability (e.g., adding richer filters, optimizing map reactivity, refining pitch script templates, or tuning database performance):

1. **Protect Established Patterns:**
   - Follow existing models in `backend/app/models.py` and UI patterns in `frontend/src/components/`.
   - Respect [docs/DESIGN.md](file:///docs/DESIGN.md): Use defined color tokens, typography scales, and tactile states (`emil-design-eng`).
2. **Prevent Scope Creep (Strict YAGNI):**
   - Refine the *existing* feature; do not invent unrelated features or bulky third-party dependencies.
   - Keep interactions tactile: loading states isolated per ID (`Set<number>`), dynamic slider fills, and smooth drawer physics.

---

## Phase 2: Verification Gate

Ensure the enhancement caused zero regressions:

1. **Backend Verification:**
   ```bash
   PYTHONPATH=backend python -m unittest backend/tests/test_api.py
   ```
2. **Frontend Verification:**
   ```bash
   cd frontend && npm run type-check && npm run build
   ```
3. **Confirm:**
   - **0 errors, 0 warnings**.
   - If new endpoint behavior was introduced, add a test case to `backend/tests/test_api.py`.

---

## Phase 3: Full Documentation Synchronization

**Never leave documentation behind code changes.** Update all affected documentation in this exact order:

### 1. Root `README.md`:
- Update Feature Highlights if capabilities expanded.
- Update API Endpoint Table if request/response schemas changed.
- Update Environment Variables table if new keys or options were introduced.
- Update Architecture overview or flow diagrams if data paths shifted.

### 2. `docs/PRD.md`:
- Keep the Product Requirements Document accurate as the single source of truth for business requirements.
- Note any refined user flows or enhanced product mapping rules.

### 3. `docs/MVP-PLAN.md`:
- Keep technical architecture, data flow diagrams, and tech stack versions aligned with current reality.

### 4. `docs/progress.md`:
- Record the enhancement under the latest completed slice.
- List all created or modified files.
- Note test results and any pending next steps.

---

## Phase 4: Summary & Git Handoff

1. Run `git status` to verify:
   - Code files modified are intentional.
   - All documentation files (`README.md`, `docs/*.md`) are staged together with code.
2. Provide a concise summary of the enhancement and the exact docs updated.
