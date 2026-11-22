---
name: fix
description: Fast, surgical bug & UI defect resolution pipeline. Combines root-cause tracing, design spec alignment, minimal patching, and regression verification in a single token-efficient pass.
---

# Surgical Bug & UI Fix Pipeline (`/fix`)

Use `/fix` whenever encountering an unexpected behavior, runtime error, test failure, or UI/UX styling defect. Instead of guessing or proposing superficial symptom patches, `/fix` executes a structured, token-efficient 4-step triage and resolution protocol.

---

## The 4-Step Fix Protocol

```
┌────────────────────────────────────────────────────────┐
│  PHASE 1: Root-Cause Investigation & Classification    │
│  (Read error / inspect UI against DESIGN.md & PRD.md)  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  PHASE 2: Spec Alignment & Pattern Comparison          │
│  (Check docs/DESIGN.md, tokens, or backend contracts)  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  PHASE 3: Surgical, Minimal Patch                      │
│  (Fix at the exact source, zero collateral refactoring)│
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  PHASE 4: Empirical Verification Gate                  │
│  (Tests + Typecheck + Build + Progress update)         │
└────────────────────────────────────────────────────────┘
```

---

## Phase 1: Root-Cause Investigation & Classification

**Iron Law: No fixes without root-cause investigation first.**

Classify the issue immediately:

### A. If It's a UI / Visual Defect (e.g. Misalignment, Color, Slider, Drawer, Font)
1. **Identify the exact offending CSS/HTML element:**
   - Search for hardcoded values (e.g., hardcoded percentages like `37%`, static widths, missing CSS variables).
   - Check if pseudo-elements (`::-webkit-slider-thumb`, `::-webkit-slider-runnable-track`) or Tailwind classes are conflicting.
2. **Inspect state binding:**
   - Is a dynamic value (like slider position, drawer visibility, active tab) desynced from component state?
   - Is a loading spinner shared globally instead of isolated per item ID?

### B. If It's a Logic, Runtime, or Network Error (e.g. 400, 422, 500, TypeError)
1. **Read full stack trace & response body:**
   - Note exact file path, function name, and line number.
   - Trace backwards from the failure point to where the bad value originated (do not fix at the symptom layer).
2. **Reproduce:**
   - Formulate minimal reproducible steps or run the relevant test.

---

## Phase 2: Spec Alignment & Pattern Comparison

Before writing code, compare the current broken behavior against the project's source of truth:

1. **For UI Defects:**
   - Compare with [docs/DESIGN.md](file:///docs/DESIGN.md): Verify color tokens, typography (`tabular-nums` for metrics), margins, and interaction guidelines.
   - Apply `emil-design-eng`: Ensure tactile press feedback (`scale(0.97)`), `--ease-drawer` curves, and smooth animations.
   - Apply `web-design-guidelines`: Check contrast ratios, focus outlines, and `aria-live` screen-reader feedback.
2. **For Logic/API Defects:**
   - Compare with [docs/PRD.md](file:///docs/PRD.md): Confirm expected business constraints, geofence rules, and data contracts.

---

## Phase 3: Surgical, Minimal Patch

Apply the most precise, minimal fix possible:

1. **Touch Only Necessary Files:**
   - Never perform opportunistic refactoring ("while I'm here...").
   - Fix the root cause at the source, not by adding hacky conditional checks downstream.
2. **Protect Against Regressions:**
   - If fixing a format issue (e.g., Indonesian phone numbers `08...` vs `628...`), ensure existing valid formats (`+628...`) still work.

---

## Phase 4: Empirical Verification Gate

Never claim an issue is resolved without concrete evidence:

1. **Run Backend Verification:**
   ```bash
   PYTHONPATH=backend python -m unittest backend/tests/test_api.py
   ```
2. **Run Frontend Verification:**
   ```bash
   cd frontend && npm run type-check && npm run build
   ```
3. **Verify Outcome:**
   - Confirm: **0 errors, 0 warnings**.
   - If visual: Confirm the UI state matches the design spec.
4. **Log in `docs/progress.md`:**
   - Document the bug, root cause, modified files, and test results.
5. **Automated Git Commit & Push:**
   - Stage verified files: `git add <files>`
   - Commit with a semantic fix message: `git commit -m "fix(<scope>): <root cause summary>"`
   - Push immediately: `git push origin main`
   - Confirm push succeeded to trigger Vercel deployment without manual intervention.
