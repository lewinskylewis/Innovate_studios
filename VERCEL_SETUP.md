# Deploying the Studio Dashboard as its own Vercel project

This repository holds two separate applications — the public marketing
site (repo root) and the Studio Dashboard (`dashboard/`) — and they must
stay two separate Vercel projects with two separate deploy lifecycles, per
the approved architecture. This file only covers the **Dashboard**; do not
change the existing public website project's settings.

The Dashboard is a Vite + React app (see `dashboard/src/`). Legacy vanilla
HTML/JS pages that haven't been migrated into React yet live under
`dashboard/legacy/` for reference only — they are not part of the build.

## 1. Create the second Vercel project

In Vercel: **Add New → Project**, import the same `lewinskylewis/Innovate_studios`
GitHub repository again (Vercel allows importing one repo into multiple
projects) — this creates **Project #2**, independent from the existing
public website project.

## 2. Project settings

| Setting | Value |
|---|---|
| Root Directory | `dashboard` |
| Framework Preset | Vite |
| Build Command | `npm run build` (already set in `dashboard/vercel.json`; runs `build-env.mjs` then `vite build`) |
| Output Directory | `dist` (already set in `dashboard/vercel.json`) |
| Install Command | *(leave default — Vercel runs `npm install` for `dashboard/package.json`'s dependencies)* |

`dashboard/vercel.json` also adds a catch-all rewrite to `/index.html` so
React Router's client-side routes (`/login`, `/studio`, `/marketing`, …)
resolve correctly on a hard refresh or direct link.

## 3. Environment variables (Project #2 only)

Project Settings → Environment Variables, for **Production**, **Preview**,
and **Development**:

| Name | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | your project's URL | Project Settings → API in Supabase. Safe to expose — this becomes a public value in `dashboard/public/env.js` at build time. |
| `SUPABASE_ANON_KEY` | your project's anon/publishable key | Also safe to expose — RLS is what actually protects the data (see the migrations' policies). |

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` here or anywhere in this
project. Nothing in this deployment needs it — see `.env.example` and the
architecture audit's §15/§18.

## 4. First deploy

Push to `main` (or trigger a manual deploy). The build command generates
`dashboard/public/env.js` from the two environment variables above, then
Vite copies it into `dist/env.js`; nothing about that file is committed to
git (see `.gitignore`).

## 5. After the first deploy

Follow `supabase/BOOTSTRAP_ADMIN.md` to create the first admin account —
sign up from the deployed Dashboard's `/login` route, then promote that
account to `admin` from the Supabase SQL editor.

## Local development

```bash
cp dashboard/public/env.example.js dashboard/public/env.js
# edit dashboard/public/env.js with your project's URL + anon key
cd dashboard
npm install
npm run dev
# open http://localhost:5173/login
```

`dashboard/public/env.js` is gitignored — never commit your local copy.
