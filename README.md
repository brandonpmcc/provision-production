# ProVision Production App

Live production management tool for ProVision Painting. Pulls deals from Airtable, photos from CompanyCam, and shows the production team everything they need to schedule, confirm, and track jobs.

## Stack

- Next.js 14 (App Router, Server Components)
- TypeScript + Tailwind CSS
- Airtable (data) + CompanyCam (photos)
- NextAuth.js (Google sign-in)
- Deployed on Vercel

## What's wired up

| Page | What it shows | Source |
|---|---|---|
| `/` Dashboard | KPIs, monthly goal, forecast strip, pending + in-progress lists | Airtable Deals + GBC Monthly Performance |
| `/pipeline` | 9-column drag-and-drop board | Airtable Production |
| `/schedule` | Multi-day bars on a week grid | Airtable Production (Start/End Date) |
| `/crews` | Crew roster + load + assignment | Airtable Crews + Production |
| `/map` | Stylized Jacksonville map with layer toggles | Production + ZIP zones |
| `/materials` | Materials status + warnings | Production |
| `/reminders` | 14/7/3/1-day reminder queue | Production |

## Environment variables (set these in Vercel)

See `.env.example` for the full list:
- `AIRTABLE_TOKEN` — Personal Access Token from airtable.com/create/tokens
- `AIRTABLE_BASE_ID` — `appHvFXShVSNjLCrG` (ProVision)
- `COMPANYCAM_TOKEN` — From CompanyCam → Settings → Integrations → Personal Access Tokens
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — From Google Cloud Console
- `NEXTAUTH_SECRET` — Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — Your deployed URL
- `ALLOWED_EMAILS` — Comma-separated team emails

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Then open http://localhost:3000.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Import the repo on vercel.com → "Add New Project".
3. Paste each value from `.env.example` into Vercel's environment variables.
4. Click Deploy.

## Team & roles

- **Brandon** (owner) — full access
- **Miriam** (production coordinator) — full access
- **Jacob** (production manager) — full access
- **Colin / Nico / Tyler** (project managers) — only see their assigned jobs

Roles are enforced server-side in `lib/auth.ts`.
