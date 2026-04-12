# EczemaTrack — Project Build Guide

> This file is the single source of truth for building the app. Claude Code should read it at the start of every session and follow it strictly. It lives at the project root.

> **Design reference:** Always consult `DESIGN.md` at the project root before writing or modifying any UI. It is the authoritative visual/interaction spec for this project (Wise-inspired). If `DESIGN.md` conflicts with ad-hoc instructions, follow `DESIGN.md` unless the user explicitly overrides it.

---

## What we're building

A **mobile-first PWA** for tracking eczema symptoms, triggers, and photos, with AI-powered pattern analysis. Users log daily (itch, stress, sleep, food, affected body areas, photos) in under 60 seconds. A Claude-powered weekly analysis surfaces correlations. Not a medical device — a "better notebook" for users and their dermatologists.

**North-star UX rule:** a daily log must be completable in under 60 seconds on a phone. Every design decision bends to that.

---

## Tech stack (locked — do not substitute)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Components | shadcn/ui + Lucide icons |
| Package manager | pnpm |
| Database / Auth / Storage | Supabase (Postgres + Auth + Storage) |
| AI | Claude API via `@anthropic-ai/sdk`, model `claude-sonnet-4-6` |
| Charts | recharts |
| Image compression | browser-image-compression |
| PWA | `@serwist/next` (or `next-pwa`) |
| Error monitoring | Sentry (`@sentry/nextjs`) |
| Hosting | Vercel (Fluid Compute, Node.js runtime) |

**Do not introduce new dependencies without asking.** If a requirement seems to need one, flag it first.

---

## Vercel platform notes (2026)

- Node.js 24 LTS is the default runtime. Use it.
- **Do not use Edge runtime** — Fluid Compute on Node is recommended and supports full Node APIs.
- Default function timeout is 300s.
- Prefer **`vercel.ts`** (with `@vercel/config`) over `vercel.json` for project config.
- Environment variables managed via `vercel env pull` / Vercel dashboard — never hardcode.
- If AI cost/observability becomes a concern later, migrate from direct Anthropic SDK to **Vercel AI Gateway**. Not for v1.

---

## Build plan — follow in order

The full prompt-by-prompt plan lives at:
`F:\Google Drive\Shared drives\Zach - Ideaverse\Zach - General Life\Zach - General Life\wiki\synthesis\eczema-app-vibe-coding-plan.md`

**Session-level breakdown:**

1. **Session 1** — Next.js skeleton, Supabase client + schema (5 tables + RLS), deploy to Vercel
2. **Session 2** — Auth flow (signup/login/reset) + bottom-nav authenticated layout
3. **Session 3** — Daily log form: itch/stress/sleep sliders, body map, food diary, photo capture
4. **Session 4** — History list + dashboard (streak, itch trend, sleep-vs-itch, triggers, body heatmap)
5. **Session 5** — `/api/analyze` Claude integration + analysis UI, 3/day rate limit
6. **Session 6** — Settings: profile, CSV export, dark mode, account delete
7. **Session 7** — PWA (manifest, service worker, install prompt) + polish pass
8. **Session 8** — Legal pages, landing page, production deploy
9. **Session 9** — Sentry + demo data seed script

**Rules of engagement per session:**
- Complete one session fully before starting the next.
- At the end of each session, commit with the message specified in the plan and push to GitHub.
- Run the "Verify" steps listed in the plan before committing.
- If a session's scope balloons, split it — never merge two sessions.

---

## Database schema (Supabase)

Five tables, all with RLS enabled, all scoped to `auth.uid()`:

- **`profiles`** — `id` (FK to `auth.users`, PK), `display_name`, `age_range`, `sex`, `region`, `climate_zone`, `skin_type` (int 1–6), `known_triggers` (text[]), `created_at`
- **`daily_logs`** — `id`, `user_id`, `log_date`, `itch_level` (0–10), `stress_level` (0–10), `sleep_hours`, `sleep_quality` (0–10), `affected_areas` (text[]), `notes`, `created_at`. **Unique (user_id, log_date).**
- **`food_entries`** — `id`, `log_id` (FK → daily_logs ON DELETE CASCADE), `food_name`, `category`, `notes`
- **`photos`** — `id`, `log_id` (FK → daily_logs ON DELETE CASCADE), `storage_path`, `body_area`, `notes`, `created_at`
- **`ai_analyses`** — `id`, `user_id`, `analysis_type`, `input_summary` (jsonb), `result` (text), `model`, `created_at`

**Trigger:** auto-create a `profiles` row on new `auth.users` insert.
**Storage bucket:** `photos` (private). Path format: `{user_id}/{log_date}/{uuid}.jpg`.

Schema lives in `supabase/schema.sql` — update it there first, then copy to the Supabase SQL editor to run.

---

## File structure (target)

```
eczema-tracker/
├── app/
│   ├── (auth)/{login,signup,reset-password}/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx           ← bottom nav + header
│   │   ├── dashboard/page.tsx
│   │   ├── log/page.tsx
│   │   ├── history/page.tsx
│   │   ├── settings/page.tsx
│   │   └── analyses/page.tsx
│   ├── api/analyze/route.ts
│   ├── {disclaimer,privacy,terms}/page.tsx
│   ├── page.tsx                 ← landing
│   └── layout.tsx               ← root
├── components/
│   ├── ui/                      ← shadcn
│   ├── body-map.tsx
│   ├── itch-slider.tsx
│   ├── food-diary.tsx
│   ├── photo-capture.tsx
│   ├── trend-chart.tsx
│   └── streak-counter.tsx
├── lib/
│   ├── supabase/{client,server,types,middleware}.ts
│   └── utils.ts
├── middleware.ts                ← Supabase session refresh + auth guard
├── supabase/schema.sql
├── scripts/seed-demo-data.ts
├── public/{manifest.json,icons/}
├── vercel.ts
├── .env.local    (gitignored)
└── .env.example
```

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
SENTRY_DSN=              # Session 9+
```

- `.env.local` is gitignored. `.env.example` tracks the shape without values.
- Set the same vars in Vercel Dashboard → Settings → Environment Variables for Preview + Production.

---

## Coding conventions

- **`DESIGN.md` is the UI source of truth.** Read it before building any component, page, or style. All typography, spacing, color, and interaction decisions defer to it.
- **Mobile-first.** Design at 375px. Max layout width 480px, centered on desktop.
- **Server Components by default.** Mark `"use client"` only when needed (forms, sliders, charts, camera).
- **Supabase server client** for any data read/write on the server (RSCs, route handlers, Server Actions). Browser client only for client-side interactivity.
- **RLS is the security boundary.** Never bypass RLS with the service role key on user-initiated paths. Service role is for migrations, webhooks, and seed scripts only.
- **Errors surface to the user as friendly messages**, never stack traces. Log details server-side.
- **No comments** unless the *why* is non-obvious. Let names carry meaning.
- **No premature abstraction.** Three similar lines is fine. Abstract on the fourth.
- **Colors:** calming palette (soft blues/greens). This is a health app, not a party app.

---

## Medical safety (non-negotiable)

- Every AI output and analysis page must end with: *"This is not medical advice. Please consult your dermatologist for treatment decisions."*
- The Claude system prompt for analysis must forbid diagnosis and prescription language.
- First-time users must acknowledge the disclaimer via explicit checkbox before entering the app.
- Never use the word "diagnose" or "treat" in user-facing copy.

---

## Commands reference

```bash
pnpm dev               # local dev
pnpm build             # production build — must pass before every deploy
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit (add this script)
vercel                 # link project
vercel env pull        # pull env vars into .env.local
vercel --prod          # deploy to production (CI does this on main push)
```

---

## Definition of done (per session)

Before committing at the end of a session, all of these must be true:

- [ ] `pnpm build` passes with zero TS errors
- [ ] `pnpm lint` passes
- [ ] The "Verify" steps from the plan for this session have been run
- [ ] Mobile layout tested at 375px (no horizontal scroll)
- [ ] If new tables/columns: RLS policies exist and were tested by logging in as a second user
- [ ] Commit message matches the one specified in the plan

---

## Current status

**Pre-Session 1.** Prereqs installed (Node 25, pnpm 10, git, Vercel CLI 50). Awaiting: Supabase project, Anthropic API key, GitHub repo, `vercel login`. Project directory not yet scaffolded.

Update this section at the end of each session.
