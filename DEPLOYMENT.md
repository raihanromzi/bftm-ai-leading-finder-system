# Deployment Guide: BFTM Radar MVP to Vercel (Development)

## Overview

This project uses **GitHub Actions** to automatically deploy both frontend (Next.js) and backend (FastAPI) to **Vercel Development environment** on every push to `main`.

**Single pipeline:** No production branch. All pushes to `main` trigger CI checks (lint, build, test) followed by auto-deployment to Vercel.

---

## Prerequisites

### 1. GitHub Repository

Your code is already hosted here:
```
https://github.com/[your-org]/bftm-ai-leading-finder-system
```

### 2. Vercel Account & Projects

You need **two Vercel projects**:

| Project | Framework | Root | Purpose |
|---------|-----------|------|---------|
| **Frontend** | Next.js | `frontend/` | Web UI (Leaflet map + leads table) |
| **Backend** | FastAPI | `backend/` | REST API (discovery, matching, export) |

**To create projects:**

#### Frontend Project
```bash
cd frontend
vercel link  # Link to Vercel, creates .vercel/project.json
# Select: "Link to existing project" or "Create new project"
# Project name: bftm-radar-frontend (or your choice)
# Framework: Next.js
# Root directory: frontend
```

#### Backend Project
```bash
cd backend
vercel link  # Link to Vercel, creates .vercel/project.json
# Project name: bftm-radar-backend (or your choice)
# Framework: Other (FastAPI / Python)
# Root directory: backend
```

**Extract project IDs from both `.vercel/project.json` files:**
```bash
cat frontend/.vercel/project.json   # copy "projectId"
cat backend/.vercel/project.json    # copy "projectId"
```

---

## GitHub Secrets Setup

Add these **three secrets** to your GitHub repository:

**GitHub Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value | Source |
|-------------|-------|--------|
| `VERCEL_TOKEN` | Personal access token | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Organization/team ID | From `frontend/.vercel/project.json` or Vercel dashboard |
| `VERCEL_PROJECT_ID` | Frontend project ID | From `frontend/.vercel/project.json` |
| `VERCEL_BACKEND_PROJECT_ID` | Backend project ID | From `backend/.vercel/project.json` *(optional, only if separate project)* |

### How to Get `VERCEL_TOKEN`

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click **Create** → Name it `bftm-ci-deploy` → No expiry → Copy token
3. Add to GitHub secret `VERCEL_TOKEN`

### How to Get `VERCEL_ORG_ID`

```bash
# After linking, check .vercel/project.json:
cat frontend/.vercel/project.json | jq '.orgId'

# Or find in Vercel dashboard:
# Settings → Team Settings → Team ID (copy this)
```

---

## Environment Variables (Both Projects)

### Frontend (`frontend/.env.production`)

```env
NEXT_PUBLIC_API_URL=https://bftm-radar-backend.vercel.app
```

> Replace `bftm-radar-backend` with your actual backend project name on Vercel.

**Set in Vercel Dashboard:**
- Frontend project → Settings → Environment Variables
- Add `NEXT_PUBLIC_API_URL` with value pointing to your backend

### Backend (`backend/.env`)

```env
GOOGLE_PLACES_API_KEY=                    # Optional; leave empty for mock data
OPENAI_API_KEY=                           # Optional; for ScrapeGraphAI (Ticket 4)
FRONTEND_ORIGIN=https://bftm-radar.vercel.app
DATABASE_URL=sqlite:///./bftm_radar.db
```

> `DATABASE_URL`: SQLite database on ephemeral Vercel filesystem. For MVP only; for production use Neon Postgres.

**Set in Vercel Dashboard:**
- Backend project → Settings → Environment Variables
- Add all env vars above (leave API keys blank for MVP)

---

## CI/CD Pipeline Flow

**File:** `.github/workflows/deploy.yml`

### On Every Push to `main`:

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Triggered                                    │
│ (Events: push to main OR pull_request to main)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┴────────────────┐
       ▼                                ▼
 ┌──────────────┐              ┌──────────────┐
 │ Frontend CI  │              │ Backend CI   │
 │ (parallel)   │              │ (parallel)   │
 └──────┬───────┘              └──────┬───────┘
        │                              │
        │ npm ci                       │ pip install
        │ type-check                   │ py_compile
        │ lint                         │ product_matching test
        │ build                        │
        │                              │
        └──────────────┬───────────────┘
                       │ Both pass?
        ┌──────────────┼───────────────┐
        │              │               │
        │         (Push only)          │
        ▼              ▼               ▼
   [Deploy-FE]  [Deploy-BE]      [Pull requests stop]
   (if passed)   (if passed)
        │              │
        └──┬───────────┘
           │
           ▼
   Live on Vercel ✅
```

### Jobs

| Job | Runs | Condition |
|-----|------|-----------|
| `frontend-ci` | Always | On push or PR to main |
| `backend-ci` | Always | On push or PR to main |
| `deploy-frontend` | Only on push | After `frontend-ci` passes |
| `deploy-backend` | Only on push | After `backend-ci` passes (if `VERCEL_BACKEND_PROJECT_ID` set) |

---

## First Deployment

### Step 1: Link Vercel Projects

```bash
# Frontend
cd frontend
vercel link
# → Follow prompts to link/create project

# Backend
cd backend
vercel link
# → Follow prompts to link/create project
```

### Step 2: Add GitHub Secrets

```bash
# In GitHub UI:
# Settings → Secrets and variables → Actions
# Add:
#   VERCEL_TOKEN = <token from vercel.com/account/tokens>
#   VERCEL_ORG_ID = <orgId from .vercel/project.json>
#   VERCEL_PROJECT_ID = <frontend projectId>
#   VERCEL_BACKEND_PROJECT_ID = <backend projectId>  (optional)
```

### Step 3: Push to Main

```bash
git add .
git commit -m "chore: add GitHub secrets setup"
git push origin main
```

**Watch deployment:**
```
GitHub → Actions → CI/CD → Deploy to Vercel (Development)
```

---

## Verifying Deployment

### Frontend

After `deploy-frontend` completes:
```bash
# Check GitHub Actions output for URL, or:
vercel ls --prod
# → Shows all projects; find frontend project
# → Click link to test
```

Expected:
- ✅ Leaflet map loads
- ✅ Branch dropdown populated
- ✅ "Scan" button works
- ✅ Table appears with mock leads

### Backend

After `deploy-backend` completes:
```bash
# Test health endpoint:
curl https://[backend-project].vercel.app/api/health

# Expected response:
# {"status":"ok","service":"bftm-radar","version":"0.1.0"}
```

---

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

Set `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
# → http://localhost:8000/docs (Swagger UI)
```

Test endpoint:
```bash
curl -X POST http://localhost:8000/api/discover \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -6.1930,
    "longitude": 106.8237,
    "radius_km": 10
  }'
```

---

## Troubleshooting

### "Vercel deploy failed: permission denied"

**Cause:** `VERCEL_TOKEN` not set or expired.

**Fix:**
```bash
# Verify secret exists:
# GitHub Settings → Secrets and variables → Actions
# Regenerate token at: https://vercel.com/account/tokens
# Update GitHub secret
# Retry: Push to main again
```

### "Frontend cannot reach backend (CORS error)"

**Cause:** `NEXT_PUBLIC_API_URL` points to wrong backend URL.

**Fix:**
1. Check backend Vercel deployment URL (from Actions or `vercel ls`)
2. Update `frontend/.env.production`:
   ```env
   NEXT_PUBLIC_API_URL=https://[actual-backend-url]
   ```
3. Redeploy frontend

### "Backend 500: database connection error"

**Cause:** SQLite database on Vercel ephemeral filesystem lost between deployments.

**For MVP:** This is expected. Each deployment starts fresh.

**For production:** Migrate to Neon Postgres:
```bash
# In Vercel Dashboard:
# Backend project → Storage → Create Database (Postgres)
# Update environment variable: DATABASE_URL = <postgres-connection-string>
```

---

## Post-MVP: Next Steps

| Ticket | Feature | Status |
|--------|---------|--------|
| 1 | Scaffold + tracer | ✅ Done |
| 2 | Hyperlocal discovery | ✅ Done (mock data) |
| 3 | Product matching | ✅ Done |
| 4 | AI enrichment + pitch | 🟡 Stub (ready for ScrapeGraphAI) |
| 5 | Pipeline + export | ✅ Done |
| **Post-MVP** | **Real Google Places API** | 🔲 Needs API key |
| **Post-MVP** | **ScrapeGraphAI integration** | 🔲 Needs OpenAI key |
| **Post-MVP** | **Production database** | 🔲 Neon Postgres |
| **Post-MVP** | **User authentication** | 🔲 Clerk or Auth0 |

---

## Support

**Vercel Docs:**
- [Vercel + GitHub Actions](https://vercel.com/docs/deployments/git/vercel-for-github)
- [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

**Questions?**
- Check GitHub Actions logs: **Actions → CI/CD → Workflow run**
- Vercel dashboard: **Settings → Deployments → View logs**

