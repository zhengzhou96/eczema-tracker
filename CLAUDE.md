# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Design reference:** Always consult `DESIGN.md` before writing or modifying any UI. It is the authoritative visual/interaction spec (Wise-inspired). `DESIGN.md` overrides ad-hoc instructions unless the user explicitly says otherwise.

---

## What we're building

Mobile-first PWA for tracking eczema symptoms, triggers, and photos with AI-powered pattern analysis. Users log daily (itch, stress, sleep, food, body areas, photos) in under 60 seconds. Claude-powered analysis surfaces correlations. Not a medical device — a "better notebook" for users and their dermatologists.

**North-star UX rule:** daily log completable in under 60 seconds on a phone.

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
| Payments | Stripe |
| PWA | `@serwist/next` |
| Hosting | Vercel (Fluid Compute, Node.js 24 LTS) |

**Do not introduce new dependencies without asking.**

---

## Commands

```bash
pnpm dev               # local dev server
pnpm build             # production build — must pass before every deploy
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit
pnpm test:run          # all Vitest unit tests
pnpm test:run __tests__/engine.test.ts   # single test file
pnpm seed <email>      # seed 30 days of demo data (--clear to wipe first)
vercel env pull        # sync env vars into .env.local
```

---

## Architecture

### Route groups
- `app/(auth)/` — unauthenticated pages (login, signup, reset-password)
- `app/(app)/` — authenticated shell; `layout.tsx` guards auth + `has_onboarded` check, redirects to `/onboarding` if needed; wraps all pages in `AppHeader` + `BottomNav` + max-width 480px container
- `app/api/` — route handlers (analyze, analyze-photo, export/csv, push/subscribe, stripe/*, cron/*)
- `app/onboarding/` — 5-screen onboarding flow, sets `has_onboarded = true` on completion

### Navigation
Bottom nav has 3 tabs (Home, Log, You) plus a `MorePanel` slide-up for secondary destinations (History, Analyses, Calendar, Routines, Settings).

### Two-layer insight system
**Layer 1 — rule engine** (`lib/insights/engine.ts`): pure TypeScript, synchronous, no API calls. Runs `getFindings()` over the last 30 logs to produce typed `Finding[]` (stress_flare, sleep_flare, food_flare, frequent_flares, clear_streak) with confidence levels. Also `getPrediction()` → `PredictionState`.

**Layer 2 — AI copy** (`lib/insights/copy-generator.ts`): takes Layer 1 findings and calls Claude to generate human-readable insight copy. Results cached daily in `ai_analyses` (type `home_insights`) — one Claude call per user per day max. Free users see `findingBasicDescription()` fallback strings; pro users get Layer 2 copy.

Home page (`app/(app)/home/page.tsx`) orchestrates both layers: fetch logs → Layer 1 findings → check tier → Layer 2 copy (pro) or basic descriptions (free) → render with `Paywall` gate.

### Monetization
Stripe integration: `app/api/stripe/checkout/route.ts` (create session), `app/api/stripe/portal/route.ts` (manage), `app/api/stripe/webhook/route.ts` (sync status to `subscriptions` table).

Tier check: `lib/subscriptions/entitlements.ts` → `getUserTier(userId)` → `"free" | "pro"`. Reads `subscriptions` table; returns `"free"` if no row, non-active status, or expired `current_period_end`.

UI gates: `<Paywall>` component for locked sections, `<UpgradeButton>` / `<ManageSubscriptionButton>` for CTA.

### `/api/analyze` (deep analysis)
Rate-limited to 3 calls/day/user. Accepts `period: "7d" | "30d"`. Calls `buildAnalysisInput()` from `lib/logs/analysis-input.ts` to aggregate logs, then streams Claude response. Results stored in `ai_analyses`.

### Supabase client pattern
- **Server** (`lib/supabase/server.ts`): use in RSCs, Server Actions, route handlers
- **Client** (`lib/supabase/client.ts`): use only in `"use client"` components
- **Never** use service role key on user-initiated paths — RLS is the security boundary

---

## Database schema

Five core tables + one monetization table, all RLS-enabled, scoped to `auth.uid()`. Schema source of truth: `supabase/schema.sql`. Apply changes by running `ALTER TABLE` in Supabase SQL Editor (schema edits don't auto-apply).

- **`profiles`** — `id` (PK/FK to auth.users), `display_name`, `age_range`, `sex`, `region`, `climate_zone`, `skin_type` (1–6), `known_triggers` (text[]), `has_onboarded` (bool)
- **`daily_logs`** — `id`, `user_id`, `log_date`, `itch_level` (0–10), `stress_level` (0–10), `sleep_hours`, `sleep_quality` (0–10), `affected_areas` (text[]), `skin_status` (`clear|mild|flare`), `quick_tags` (text[]), `notes`. **Unique (user_id, log_date).**
- **`food_entries`** — `id`, `log_id` (FK → daily_logs CASCADE), `food_name`, `category`, `notes`
- **`photos`** — `id`, `log_id` (FK → daily_logs CASCADE), `storage_path`, `body_area`, `notes`
- **`ai_analyses`** — `id`, `user_id`, `analysis_type`, `input_summary` (jsonb), `result` (text), `model`
- **`subscriptions`** — `id`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`

**Trigger:** auto-create `profiles` row on `auth.users` insert.
**Storage bucket:** `photos` (private). Path: `{user_id}/{log_date}/{uuid}.jpg`.

---

## Tests

Test files live in `__tests__/`:
- `engine.test.ts` — 66 tests for Layer 1 rule engine
- `analytics.test.ts` — 50 tests for log analytics
- `smoke.test.ts` — basic sanity checks

Vitest resolves `@/` alias to project root (see `vitest.config.ts`). Tests run in Node environment with no browser APIs.

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
SENTRY_DSN=
```

`.env.local` is gitignored. `.env.example` tracks shape. Mirror in Vercel Dashboard for Preview + Production.

---

## Coding conventions

- **Mobile-first.** Design at 375px. Max layout width 480px, centered on desktop.
- **Server Components by default.** Mark `"use client"` only for forms, sliders, charts, camera.
- **No Edge runtime.** All route handlers use `export const runtime = "nodejs"`.
- **No comments** unless the *why* is non-obvious.
- **No premature abstraction.** Three similar lines is fine; abstract on the fourth.

---

## Medical safety (non-negotiable)

- Every AI output must end with: *"This is not medical advice. Please consult your dermatologist for treatment decisions."*
- Claude system prompt must forbid diagnosis and prescription language.
- Never use "diagnose", "treat", "prescribe", or "diagnosis" in user-facing copy.
- First-time users acknowledge disclaimer via checkbox before entering app.

---

## Vercel platform notes

- Node.js 24 LTS default. No Edge runtime.
- Prefer `vercel.ts` (with `@vercel/config`) over `vercel.json`.
- Default function timeout 300s.

---

## Current status

**Sessions 1–12 + redesign + monetization complete.**

Built: auth → daily log (QuickLogForm 4-step) → dashboard/history → Claude analysis (2-layer) → home/milestones/you/calendar/routines/photo-AI → PWA → onboarding flow → settings (profile, CSV export, account delete) → legal pages → Stripe monetization (checkout/portal/webhook, free/pro tiers, Paywall component)

Tests: 116 unit tests (Vitest).

**Remaining:**
- Sentry error monitoring (`@sentry/nextjs`)
- Production smoke test on real device

Update this section at the end of each session.
