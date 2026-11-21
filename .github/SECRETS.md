# GitHub Secrets Setup for Vercel Deployment

Add all three secrets in **GitHub → Settings → Secrets and variables → Actions → New repository secret**.

---

## 1. Get Your Vercel Token

1. Go to [https://vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click **Create** → give it a name like `bftm-ci-deploy` → no expiry (or 90 days)
3. Copy the token → add as secret:

   | Secret name    | Value              |
   |----------------|--------------------|
   | `VERCEL_TOKEN` | *(your token)*     |

---

## 2. Get Your Vercel Org ID & Project ID

Run this once locally (requires Vercel CLI: `npm i -g vercel`):

```bash
cd /Users/raihanromzi/Documents/Development/bftm-ai-leading-finder-system/frontend
vercel link
# → Follow prompts, link to your Vercel project
cat .vercel/project.json
```

This prints something like:
```json
{
  "orgId": "team_xxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxx"
}
```

Add both as secrets:

| Secret name        | Value from `project.json` |
|--------------------|--------------------------|
| `VERCEL_ORG_ID`    | `orgId`                  |
| `VERCEL_PROJECT_ID`| `projectId`              |

---

## 3. Verify

After adding the 3 secrets, push any commit to `main`. The Actions tab should show:
- ✅ **Lint & Build** job passes
- ✅ **Deploy to Vercel (Production)** job completes with a deployment URL

---

> **Note:** The `.vercel/` directory created by `vercel link` is gitignored automatically.
> Never commit your token or the `project.json` values directly into code.
