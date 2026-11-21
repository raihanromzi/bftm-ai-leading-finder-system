---
name: to-prd
description: Convert confirmed brainstorming decisions into a concise, build-ready Product Requirements Document at docs/PRD.md. Use after /grill-me or whenever locking MVP scope before coding.
---

# MVP PRD Generator (`/to-prd`)

Convert the settled decisions from the conversation into `docs/PRD.md`. Do NOT ask new interview questions unless a critical blocker is still unresolved. Do NOT invent features that were never agreed upon.

## Output File: `docs/PRD.md`
Write `docs/PRD.md` using this exact structure:

```markdown
# PRD: [Product Name] (MVP)

## 1. Problem & Target User
- **Target User:** [Specific persona]
- **Core Pain:** [1–2 sentences]
- **Success Metric (v1):** [Single measurable outcome proving the MVP works]

## 2. Core User Flow (Happy Path)
1. [Step 1: Entry / Auth]
2. [Step 2: Core Action]
3. [Step 3: Value Delivered]

## 3. MVP Functional Requirements (In-Scope)
- **[FR-1] [Feature Name]:** [Exact expected behavior + acceptance criteria]
- **[FR-2] [Feature Name]:** [Exact expected behavior + acceptance criteria]

## 4. Explicit Non-Goals (Out of Scope for MVP)
- [Cut feature 1 + brief reason]
- [Cut feature 2 + brief reason]

## 5. Minimal Tech Stack & Data Model
- **Stack:** [Frontend, Backend, DB, Auth, Hosting]
- **Core Entities / Schema:** [Minimal tables/collections and key fields]
- **Key Endpoints / Actions:** [Minimal API routes or server actions]
