# EczemaTrack Product Redesign — Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Scope:** Navigation overhaul, quick-log flow, rule-based insight engine with AI copy, onboarding, history simplification

---

## 1. Context & Motivation

Sessions 1–12 built a feature-complete "medical notebook": complex log form, recharts dashboard, milestones, routines, AI analysis, calendar. The redesign pivots toward a habit-formation app — faster logging, emotion-first home screen, rule-based intelligence that surfaces patterns automatically, and an onboarding flow designed to eliminate guilt.

The north-star rule from CLAUDE.md stays: **a daily log must be completable in under 60 seconds on a phone.**

---

## 2. Navigation

### Structure
3 primary tabs + center FAB + overflow:

```
Home  |  History  |  [+]  |  ···More
```

- **Home** — today status, patterns, prediction, weekly summary
- **History** — emoji strip + collapsible log list
- **[+] FAB** — opens quick-log flow (always accessible)
- **⋯ More** — overflow panel exposing: Dashboard, You, Calendar, Milestones, Routines, AI Analysis

### More Panel
Slides up as a bottom sheet on tap. Lists existing pages as tappable rows — they're not deleted, just deprioritised. No nested navigation.

### Existing BottomNav component
Replace the current 4-tab layout (`Home · History · Dashboard · You`) with the new 3-tab + More layout. The `logActive` FAB logic stays.

---

## 3. Home Screen

### Section order (top → bottom)

1. **Greeting header** — "Good morning, [first name]"
2. **Last check-in card** — shows most recent log: emoji + skin status + tags + date. If today is already logged, card reads "Today · [status]" with an Edit link. If not, the card has a green "Log today" pill button.
3. **Your Skin Patterns** — rule-based insight cards (see §7). Up to 3 insights, each with a confidence badge (`possible` / `likely` / `strong`). Empty state: *"Log once to start discovering patterns"*
4. **Tomorrow's Forecast** — prediction card (dark `#163300` background). Shows one of: elevated risk, stable, or absent entirely. Empty state (fewer than 2 logs): absent.
5. **This Week** — 7-day emoji strip (Mon–Sun). Days with no entry show a dimmed `—` (no label, no "Missed"). Below strip: `X flare · Y mild · Z clear` + "Best day: [weekday]" if a clear day exists.
6. **Disclaimer** — "Not medical advice. Consult your dermatologist." (required per CLAUDE.md)

### Empty states (emotional design)

| Situation | Copy |
|---|---|
| No logs at all | *"Log once to start discovering patterns"* |
| Fewer than 3 logs (patterns) | *"Log [N] more days to unlock your first pattern"* |
| Fewer than 2 logs (prediction) | Prediction card absent — no placeholder |
| No data for a day (week strip) | Dimmed `—` — no label |

---

## 4. Quick-Log Flow

4 steps. Replaces the current log form as the primary entry point. The existing detailed form becomes an optional "Add more detail" escape hatch from step 4.

### Step 1 — Skin status (full screen)
```
How is your skin today?
[ 👍 Clear ]
[ 😐 Mild  ]
[ 🔥 Flare ]
```
Tapping any button **saves immediately** (upserts today's `daily_log` row with `skin_status`), then advances to step 2. Data is captured even if the user closes after this step.

### Step 2 — Context chips (optional)
```
Anything notable?
[ 🍜 Food ]  [ 😰 Stress ]  [ 😴 Poor sleep ]
[ 🧴 New product ]  [ 🌦 Weather ]
[ Done → ]  [ Skip ]
```
Multi-select. Tapping a chip toggles it highlighted. "Done" or "Skip" advances to step 3 (if Stress or Food selected) or step 4 (otherwise).

### Step 3 — Conditional micro-inputs (skipped if no qualifying chips)
Appears only if Stress or Food chips were selected:

- **Stress chip** → stress level slider (Low → High), maps to `stress_level` (2 / 5 / 8)
- **Food chip** → recent foods list (from `food_entries`) with "+ Add food…" option. Saves to `food_entries` as before.
- Both chips selected → both inputs shown on same screen, single "Done →" button.

New product and Weather chips require no micro-input — they're stored in `quick_tags` only.

### Step 4 — Done state
```
✅ Logged
"[insight copy or fallback]"
[ Add more detail → ]   ← opens existing detail form
[ Go home ]
```
The insight shown here is generated **synchronously from Layer 1 only** — no Claude call, to avoid latency after logging. Run `getFindings()` inline, pick the finding with the highest `matchCount`, and render a static template string for it. If <3 total logs, show: *"We're starting to detect patterns."* The full AI-generated copy (Layer 2) is only ever generated on Home page load and cached there.

"Add more detail" opens the existing `LogForm` component with today's data pre-populated.

---

## 5. History Screen

### Layout (top → bottom)

1. **"History"** heading
2. **7-day trend strip** — same emoji strip as Home, with day labels (Mon–Sun)
3. **Log list** — one card per day, newest first, collapsed by default

### Log card (collapsed)
```
🔥  Friday, Apr 11
    😰 Stress · 😴 Poor sleep           ↓
```

### Log card (expanded, tap to toggle)
Shows quick-log fields first (skin status, tags), then detail form fields below only if they were filled in (itch 0–10, sleep hours, stress level, affected areas, notes). "Edit →" button opens the detail form.

### Missed days
Days with no entry: **not shown in the list at all**. The 7-day strip shows a dimmed `—` for those days, but the list skips them entirely. No "Missed" label anywhere.

---

## 6. Onboarding Flow

First-run only, post-signup. Lives at `/onboarding` (a new route under `app/(app)/onboarding/page.tsx`). The `app/(app)/layout.tsx` server component checks `profiles.has_onboarded` — if `false`, redirects to `/onboarding` before rendering any app page. Existing users (`has_onboarded = true`) never see it. No "Skip" button — the flow is short enough that it's not needed.

### 5 screens

| Screen | Theme | Key copy |
|---|---|---|
| 1 — Hook | Dark (`#163300` bg) | *"Let's figure out what's triggering your eczema"* / *"No long tracking. Just quick check-ins."* |
| 2 — Expectation reset | Light | *"You don't need to be consistent"* / *"Even occasional logs help us find patterns. No streaks. No guilt."* |
| 3 — How it works | Light | 3-step numbered list: Tap how your skin feels → Add quick context (optional) → We detect your patterns |
| 4 — Motivation | Light | *"Most users discover their top trigger within 7 days"* |
| 5 — First log | Light, green border | Drops straight into the quick-log Step 1 UI — no CTA button, just the three skin status choices |

Completing screen 5 (tapping a skin status button) sets `has_onboarded = true` on `profiles` and proceeds through the quick-log flow normally.

---

## 7. Insight Engine

### Architecture — two layers

**Layer 1 — Rule engine** (`lib/insights/engine.ts`)
Pure TypeScript, no API calls, runs synchronously. Takes last 30 days of `DailyLog[]` and `FoodEntry[]`. Returns:

```ts
type Finding = {
  rule: 'stress_flare' | 'sleep_flare' | 'food_flare' | 'consecutive_flares' | 'clear_streak'
  confidence: 'possible' | 'likely' | 'strong'  // 2-3 / 4-5 / 6+ matches
  matchCount: number
  supportingData?: string  // e.g. "dairy appeared before 4 of 5 flares"
}

type PredictionState = 'elevated' | 'stable' | 'neutral'

getFindings(logs: DailyLog[], foods: FoodEntry[]): Finding[]
getPrediction(logs: DailyLog[]): PredictionState
```

**Rules:**

| Rule ID | Condition | Minimum data |
|---|---|---|
| `stress_flare` | `stress` in `quick_tags` on day N, `skin_status = 'flare'` within 1 day | 2 occurrences |
| `sleep_flare` | `poor_sleep` in `quick_tags` on day N, flare within 1 day | 2 occurrences |
| `food_flare` | `food` in `quick_tags` + same `food_name` appears before flare repeatedly | 2 occurrences |
| `consecutive_flares` | 3+ flare days within any 7-day window | 3 days |
| `clear_streak` | 3+ clear days in a row | 3 days |

**Prediction rules:**

| State | Condition |
|---|---|
| `elevated` | Last 2 logs = flare, OR `stress` tag in last 2 logs |
| `stable` | Last 2 logs = clear |
| `neutral` | Everything else, or fewer than 2 logs |

**Minimum data gate:** fewer than 3 total logs → `getFindings()` returns `[]` → skip Layer 2 entirely.

---

**Layer 2 — AI copy generator** (`lib/insights/copy-generator.ts`)
Takes `Finding[]` + `PredictionState` → calls Claude (`claude-sonnet-4-6`) → returns natural-language copy for each insight card and the prediction card.

**Dermatologist context module** (`lib/insights/dermatologist-context.ts`)
Exports a single string: the Claude system prompt. Written and reviewed by a dermatologist collaborator. Covers: eczema trigger physiology, how to frame correlations without diagnosis language, confidence hedging conventions, and the mandatory disclaimer. This module is the v1→v2 boundary — replacing the export with an async RAG retrieval function migrates to the knowledge base approach without changing `copy-generator.ts`.

**System prompt constraints (required):**
- Never use "diagnose", "treat", "cure", or "prescribe"
- Always hedge: "may", "appears to", "based on your logs"
- Each insight card must end with or link to the medical disclaimer
- Max 2 sentences per insight card
- Max 1 sentence for the prediction card subtext

### Caching

Uses the existing `ai_analyses` table:
- `analysis_type = 'home_insights'`
- `input_summary` stores the structured findings as JSONB (for debugging + future RAG training data)
- Cache hit: row exists where `user_id = $1` AND `created_at::date = today`
- Cache miss: run Layer 1 → call Claude → insert row → return `result`
- Natural daily expiry — no explicit invalidation. Stale-within-day is acceptable for v1.

### Home page load sequence
1. Fetch last 30 days of logs + today's food entries (single join query)
2. Check `ai_analyses` for today's `home_insights` cache
3. **Hit** → render immediately (zero AI cost)
4. **Miss** → run rule engine → if findings exist, call Claude → cache → render
5. **<3 logs** → skip Claude, render empty state copy

---

## 8. Schema Migration

```sql
-- daily_logs additions
ALTER TABLE daily_logs
  ADD COLUMN skin_status TEXT
    CHECK (skin_status IN ('clear', 'mild', 'flare')),
  ADD COLUMN quick_tags  TEXT[] NOT NULL DEFAULT '{}';

-- profiles addition
ALTER TABLE profiles
  ADD COLUMN has_onboarded BOOLEAN NOT NULL DEFAULT false;
```

Both `skin_status` and `quick_tags` are nullable/defaulted — existing rows are unaffected. The existing RLS policies cover the new columns automatically (policies are row-level, not column-level).

`supabase/schema.sql` updated to include these columns.

---

## 9. Chip → Column Mapping

| Chip | `quick_tags` value | Also writes |
|---|---|---|
| 😰 Stress | `'stress'` | `stress_level` (slider: 2 / 5 / 8) |
| 😴 Poor sleep | `'poor_sleep'` | — |
| 🍜 Food | `'food'` | `food_entries` rows (existing flow) |
| 🧴 New product | `'new_product'` | — |
| 🌦 Weather | `'weather'` | — |

---

## 10. Emotional Design Copy Principles

Applied throughout — these are constraints, not suggestions:

| Situation | ❌ Don't | ✅ Do |
|---|---|---|
| No data | "No data available" | "Log once to start discovering patterns" |
| Partial entry | "Incomplete" | "Even small inputs help" |
| Missed day | "Missed", red indicator | Nothing — silence |
| Logging CTA | "Don't forget to log" | "Quick check-in — takes 2 seconds" |
| Progress | Generic "Keep going" | "You had fewer flare days this week" |

---

## 11. Retention Hooks (design only — not implemented in this session)

Modelled here so the architecture accounts for them. **No push infrastructure built yet.**

| Touchpoint | Trigger | Copy direction |
|---|---|---|
| Weekly report | Every Monday AM | "We found your top trigger this week" → opens Home |
| Re-engagement nudge | 3 days inactive | "Quick check-in — takes 2 seconds" |
| Progress reinforcement | Fewer flare days than last week | "You had fewer flare days this week" |

Implementation will require: VAPID key pair, `push_subscriptions` table (`user_id`, `endpoint`, `keys`), a `/api/push/subscribe` route, and a scheduled Vercel Cron job. Out of scope for the current session.

---

## 12. Monetisation Architecture (design only — not implemented)

**Free tier:** logging, basic patterns (possible/likely), 7-day history strip.

**Paid tier ("Understand your eczema fully"):**
- `strong` confidence insights
- Predictions
- Full history (beyond 30 days)
- Weekly AI report
- CSV export for dermatologist

Gate via a `subscription_tier` column on `profiles` (`'free'` | `'pro'`). No payment infrastructure built yet — the column is the placeholder.

---

## 13. Files Affected

### New files
- `lib/insights/engine.ts` — rule engine (Layer 1)
- `lib/insights/copy-generator.ts` — Claude copy generation (Layer 2)
- `lib/insights/dermatologist-context.ts` — system prompt module (v1→v2 boundary)
- `components/quick-log-form.tsx` — 4-step quick-log client component
- `components/more-panel.tsx` — bottom sheet overflow nav (client component)
- `components/onboarding-flow.tsx` — 5-screen first-run client component
- `app/(app)/onboarding/page.tsx` — onboarding route (renders `OnboardingFlow`)

### Modified files
- `app/(app)/home/page.tsx` — rebuilt around new Home sections
- `app/(app)/history/page.tsx` — simplified to emoji strip + collapsible list
- `app/(app)/layout.tsx` — onboarding gate (check `has_onboarded`)
- `app/(app)/log/page.tsx` — replaced with quick-log flow; existing `LogForm` becomes the detail form
- `components/bottom-nav.tsx` — 3 tabs + More
- `supabase/schema.sql` — new columns

### Unchanged
- `app/(app)/dashboard/`, `milestones/`, `routines/`, `calendar/`, `analyses/`, `analyze-photo/` — all remain, accessible via More panel
- `components/body-map.tsx`, `food-diary.tsx`, `photo-capture.tsx`, `itch-slider.tsx` — used by existing detail form, untouched
- All auth routes, Supabase client, middleware

---

## 14. Definition of Done

- [ ] `pnpm build` passes, zero TS errors
- [ ] `pnpm lint` passes
- [ ] Quick-log saves `skin_status` + `quick_tags` to Supabase on step 1 tap
- [ ] Home patterns section shows empty state for <3 logs; shows AI copy for ≥3 logs
- [ ] Prediction card absent when <2 logs; correct state for ≥2 logs
- [ ] Onboarding shows for new users (`has_onboarded = false`), skipped for existing
- [ ] More panel opens and all 6 existing pages are reachable
- [ ] History: missed days not shown in list; dimmed `—` in 7-day strip
- [ ] Mobile layout verified at 375px
