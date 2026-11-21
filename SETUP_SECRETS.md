# GitHub Secrets Setup — Automated Instructions

Your Vercel projects are **linked and ready**. Now add GitHub secrets to auto-deploy on every push to `main`.

## ✅ Already Linked
- **Frontend Project ID:** `prj_dkwSb7VzseoZntbutsP6HJh8H3mG`
- **Backend Project ID:** `prj_my2QcilPAiK7jaKDqHzS6nSZsqOh`
- **Org ID:** `team_mImLvq5lwgxDsJsgwrShv2hA`

## Step 1: Create Vercel Token (Do This Once)

Run in your terminal:
```bash
vercel token create bftm-ci-deploy
```

This will print a **live token**. **Copy it** (it won't be shown again).

## Step 2: Add GitHub Secrets (Automated)

Paste the token and run:
```bash
export VERCEL_TOKEN="your-token-from-step-1"
export VERCEL_ORG_ID="team_mImLvq5lwgxDsJsgwrShv2hA"
export VERCEL_PROJECT_ID="prj_dkwSb7VzseoZntbutsP6HJh8H3mG"
export VERCEL_BACKEND_PROJECT_ID="prj_my2QcilPAiK7jaKDqHzS6nSZsqOh"

# Then add all to GitHub:
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"
gh secret set VERCEL_BACKEND_PROJECT_ID --body "$VERCEL_BACKEND_PROJECT_ID"

echo "✓ All secrets added to GitHub"
gh secret list
```

## Step 3: Deploy

```bash
git add -A
git commit -m "chore: Vercel projects linked"
git push origin main
```

**Watch at:** GitHub → Actions → `CI/CD → Deploy to Vercel (Development)` ✅

---

**That's it!** From now on, every push to `main` auto-deploys both frontend and backend to Vercel.

