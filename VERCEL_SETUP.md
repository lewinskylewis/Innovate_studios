# Deploying the Studio Dashboard as its own Vercel project

This repository holds two separate applications — the public marketing
site (repo root) and the Studio Dashboard (`dashboard/`) — and they must
stay two separate Vercel projects with two separate deploy lifecycles, per
the approved architecture. This file only covers the **Dashboard**; do not
change the existing public website project's settings.

## 1. Create the second Vercel project

In Vercel: **Add New → Project**, import the same `lewinskylewis/Innovate_studios`
GitHub repository again (Vercel allows importing one repo into multiple
projects) — this creates **Project #2**, independent from the existing
public website project.

## 2. Project settings

| Setting | Value |
|---|---|
| Root Directory | `dashboard` |
| Framework Preset | Other |
| Build Command | `node ../scripts/build-env.mjs` (already set in `dashboard/vercel.json`) |
| Output Directory | `.` (already set in `dashboard/vercel.json`) |
| Install Command | *(leave default/empty — there are no npm dependencies to install)* |

Vercel checks out the full repository for the build step even with a
scoped Root Directory, so `../scripts/build-env.mjs` resolves correctly.

## 3. Environment variables (Project #2 only)

Project Settings → Environment Variables, for **Production**, **Preview**,
and **Development**:

| Name | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | your project's URL | Project Settings → API in Supabase. Safe to expose — this becomes a public value in `dashboard/js/env.js` at build time. |
| `SUPABASE_ANON_KEY` | your project's anon/publishable key | Also safe to expose — RLS is what actually protects the data (see the migrations' policies). |

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` here or anywhere in this
project. Nothing in this deployment needs it — see `.env.example` and the
architecture audit's §15/§18.

## 4. First deploy

Push to `main` (or trigger a manual deploy). The build command generates
`dashboard/js/env.js` from the two environment variables above; nothing
about that file is committed to git (see `.gitignore`).

## 5. After the first deploy

Follow `supabase/BOOTSTRAP_ADMIN.md` to create the first admin account —
sign up from the deployed Dashboard's `/login.html`, then promote that
account to `admin` from the Supabase SQL editor.

## Local development

```bash
cp dashboard/js/env.example.js dashboard/js/env.js
# edit dashboard/js/env.js with your project's URL + anon key
node preview-server.mjs
# open http://localhost:4321/dashboard/login.html
```

`dashboard/js/env.js` is gitignored — never commit your local copy.
