
#### 3. `.agents/skills/to-tickets/SKILL.md`
```markdown
---
name: to-tickets
description: Slice docs/PRD.md into ordered, vertical tracer-bullet MVP tickets inside docs/progress.md so any coding agent can execute them one context window at a time.
---

# Vertical MVP Ticket Slicer (`/to-tickets`)

Read `docs/PRD.md` and break the entire MVP into small, dependency-ordered **vertical slices** (each ticket must deliver a testable end-to-end increment, never "build entire DB first, then entire UI later").

## Output File: `docs/progress.md`
Write the ticket backlog to `docs/progress.md`:

```markdown
# MVP Build Progress & Ticket Queue

## Current Status
- **Active Ticket:** Ticket 1
- **Last Updated By:** [Agent Name]
- **Blockers:** None

## Ticket Queue
- [ ] **Ticket 1: Project Scaffold & Tracer Bullet** — Minimal repo setup, DB connection, and 1 end-to-end working route/screen.
  - *Acceptance Check:* [Exact command or browser check to verify]
- [ ] **Ticket 2: [Core Flow Slice 1]** — [Scope]
  - *Acceptance Check:* [Verification]
- [ ] **Ticket 3: [Core Flow Slice 2]** — [Scope]
  - *Acceptance Check:* [Verification]
