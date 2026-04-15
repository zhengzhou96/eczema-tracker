# Product Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot EczemaTrack from a medical notebook to a habit-formation app — replacing the 4-tab nav with a 3-tab + More layout, adding a 4-step quick-log flow, a rule-based insight engine with AI-generated copy, and a 5-screen first-run onboarding flow.

**Architecture:** Layer 1 is a pure TypeScript rule engine (`lib/insights/engine.ts`) that runs synchronously on the last 30 days of logs. Layer 2 is a Claude copy generator (`lib/insights/copy-generator.ts`) that turns findings into natural-language insight cards, cached once per day in `ai_analyses`. The quick-log form is a 4-step client component that saves `skin_status` immediately on tap and updates `quick_tags` on completion.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase (Postgres + RLS), Claude API (`@anthropic-ai/sdk`, `claude-sonnet-4-6`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/schema.sql` | Modify | Add `skin_status`, `quick_tags` to `daily_logs`; `has_onboarded` to `profiles`; migrate existing users |
| `lib/supabase/types.ts` | Modify | Add new columns to Database interface |
| `lib/logs/analytics.ts` | Modify | Add `skin_status`, `quick_tags` to `LogSummary` |
| `lib/insights/engine.ts` | Create | Layer 1 rule engine — `getFindings()`, `getPrediction()` |
| `lib/insights/dermatologist-context.ts` | Create | Dermatologist system prompt string (v1→v2 boundary) |
| `lib/insights/copy-generator.ts` | Create | Layer 2 — calls Claude, returns `InsightCopy`, caches in `ai_analyses` |
| `app/(app)/log/quick-actions.ts` | Create | Server Actions: `saveQuickStatus()`, `saveQuickTags()` |
| `components/week-strip.tsx` | Create | 7-day emoji strip (shared by Home + History) |
| `components/quick-log-form.tsx` | Create | 4-step quick-log client component |
| `components/more-panel.tsx` | Create | Bottom-sheet overflow nav (client component) |
| `components/history-list.tsx` | Create | Collapsible log list (client component) |
| `components/onboarding-flow.tsx` | Create | 5-screen first-run client component |
| `components/bottom-nav.tsx` | Modify | Replace 4-tab layout with 3-tab + More |
| `app/(app)/log/page.tsx` | Modify | Render `QuickLogForm`; existing form at `?detail=1` |
| `app/(app)/home/page.tsx` | Modify | Rebuilt: last check-in, patterns, prediction, week strip |
| `app/(app)/history/page.tsx` | Modify | Rebuilt: week strip + `HistoryList` |
| `app/(app)/layout.tsx` | Modify | Add onboarding gate: redirect to `/onboarding` if `has_onboarded = false` |
| `app/onboarding/page.tsx` | Create | Onboarding route at root level (outside `(app)` group) |

---

## Task 1: Schema Migration + Type Updates

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `lib/supabase/types.ts`
- Modify: `lib/logs/analytics.ts`

- [ ] **Step 1: Add migration SQL to the bottom of `supabase/schema.sql`**

Append these statements at the end of `supabase/schema.sql` (after the storage policies):

```sql
-- ---------------------------------------------------------------------------
-- 2026-04-15 Product redesign: quick-log columns
-- ---------------------------------------------------------------------------
alter table public.daily_logs
  add column if not exists skin_status text
    check (skin_status in ('clear', 'mild', 'flare')),
  add column if not exists quick_tags text[] not null default '{}'::text[];

alter table public.profiles
  add column if not exists has_onboarded boolean not null default false;

-- Mark all existing users as already onboarded (they pre-date onboarding)
update public.profiles set has_onboarded = true where has_onboarded = false;
```

- [ ] **Step 2: Run the migration in Supabase**

Open Supabase Dashboard → SQL Editor. Paste and run the four statements from Step 1. Expected: no errors, `ALTER TABLE` success messages.

- [ ] **Step 3: Update `lib/supabase/types.ts` — add columns to `daily_logs`**

In the `daily_logs` table, add to `Row`, `Insert`, and `Update` interfaces:

```typescript
// In daily_logs → Row (after notes)
skin_status: 'clear' | 'mild' | 'flare' | null;
quick_tags: string[];

// In daily_logs → Insert (after notes)
skin_status?: 'clear' | 'mild' | 'flare' | null;
quick_tags?: string[];

// In daily_logs → Update (after notes)
skin_status?: 'clear' | 'mild' | 'flare' | null;
quick_tags?: string[];
```

- [ ] **Step 4: Update `lib/supabase/types.ts` — add `has_onboarded` to `profiles`**

```typescript
// In profiles → Row (after known_triggers)
has_onboarded: boolean;

// In profiles → Insert (after known_triggers)
has_onboarded?: boolean;

// In profiles → Update (after known_triggers)
has_onboarded?: boolean;
```

- [ ] **Step 5: Update `lib/logs/analytics.ts` — add new fields to `LogSummary`**

Find `LogSummary` in `lib/logs/analytics.ts`. It uses `Pick<DailyLog, ...>`. Add `skin_status` and `quick_tags`:

```typescript
export type LogSummary = Pick<
  DailyLog,
  | "id"
  | "log_date"
  | "itch_level"
  | "stress_level"
  | "sleep_hours"
  | "sleep_quality"
  | "affected_areas"
  | "notes"
  | "skin_status"
  | "quick_tags"
>;
```

- [ ] **Step 6: Verify**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/schema.sql lib/supabase/types.ts lib/logs/analytics.ts
git commit -m "feat: add skin_status, quick_tags, has_onboarded columns + migrate existing users"
```

---

## Task 2: Layer 1 — Insight Rule Engine

**Files:**
- Create: `lib/insights/engine.ts`

- [ ] **Step 1: Create `lib/insights/engine.ts`**

```typescript
export type SkinStatus = 'clear' | 'mild' | 'flare';

export interface InsightLog {
  log_date: string;
  skin_status: SkinStatus | null;
  quick_tags: string[];
  stress_level: number | null;
  itch_level: number | null;
}

export interface InsightFood {
  food_name: string;
  log_date: string;
}

export type FindingRule =
  | 'stress_flare'
  | 'sleep_flare'
  | 'food_flare'
  | 'consecutive_flares'
  | 'clear_streak';

export type Confidence = 'possible' | 'likely' | 'strong';

export interface Finding {
  rule: FindingRule;
  confidence: Confidence;
  matchCount: number;
  supportingData?: string;
}

export type PredictionState = 'elevated' | 'stable' | 'neutral';

function confidenceFromCount(count: number): Confidence {
  if (count >= 6) return 'strong';
  if (count >= 4) return 'likely';
  return 'possible';
}

export function getFindings(logs: InsightLog[], foods: InsightFood[]): Finding[] {
  if (logs.length < 3) return [];

  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const findings: Finding[] = [];

  // stress_flare: stress tag on day N, flare within 1 day
  let stressFlareCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i]!;
    if (!log.quick_tags.includes('stress')) continue;
    const nextDay = sorted[i + 1];
    const sameOrNext =
      log.skin_status === 'flare' ||
      (nextDay && nextDay.skin_status === 'flare');
    if (sameOrNext) stressFlareCount++;
  }
  if (stressFlareCount >= 2) {
    findings.push({
      rule: 'stress_flare',
      confidence: confidenceFromCount(stressFlareCount),
      matchCount: stressFlareCount,
    });
  }

  // sleep_flare: poor_sleep tag on day N, flare within 1 day
  let sleepFlareCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i]!;
    if (!log.quick_tags.includes('poor_sleep')) continue;
    const nextDay = sorted[i + 1];
    const sameOrNext =
      log.skin_status === 'flare' ||
      (nextDay && nextDay.skin_status === 'flare');
    if (sameOrNext) sleepFlareCount++;
  }
  if (sleepFlareCount >= 2) {
    findings.push({
      rule: 'sleep_flare',
      confidence: confidenceFromCount(sleepFlareCount),
      matchCount: sleepFlareCount,
    });
  }

  // food_flare: food tag + same food_name appears before flare repeatedly
  const foodsByDate = new Map<string, string[]>();
  for (const f of foods) {
    const existing = foodsByDate.get(f.log_date) ?? [];
    existing.push(f.food_name.toLowerCase());
    foodsByDate.set(f.log_date, existing);
  }
  const foodFlareCounts = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i]!;
    if (!log.quick_tags.includes('food')) continue;
    const nextDay = sorted[i + 1];
    const followedByFlare =
      log.skin_status === 'flare' ||
      (nextDay && nextDay.skin_status === 'flare');
    if (!followedByFlare) continue;
    const dayFoods = foodsByDate.get(log.log_date) ?? [];
    for (const food of dayFoods) {
      foodFlareCounts.set(food, (foodFlareCounts.get(food) ?? 0) + 1);
    }
  }
  let topFood: string | null = null;
  let topFoodCount = 0;
  for (const [food, count] of foodFlareCounts) {
    if (count > topFoodCount) {
      topFood = food;
      topFoodCount = count;
    }
  }
  if (topFood && topFoodCount >= 2) {
    findings.push({
      rule: 'food_flare',
      confidence: confidenceFromCount(topFoodCount),
      matchCount: topFoodCount,
      supportingData: `${topFood} appeared before ${topFoodCount} flares`,
    });
  }

  // consecutive_flares: 3+ flare days within any 7-day window
  let maxConsecutive = 0;
  let windowFlares = 0;
  const windowSize = 7;
  for (let i = 0; i < sorted.length; i++) {
    const windowStart = sorted[Math.max(0, i - windowSize + 1)]!.log_date;
    const windowEnd = sorted[i]!.log_date;
    windowFlares = sorted
      .slice(Math.max(0, i - windowSize + 1), i + 1)
      .filter((l) => l.skin_status === 'flare').length;
    if (windowFlares > maxConsecutive) maxConsecutive = windowFlares;
    void windowStart;
    void windowEnd;
  }
  if (maxConsecutive >= 3) {
    findings.push({
      rule: 'consecutive_flares',
      confidence: confidenceFromCount(maxConsecutive),
      matchCount: maxConsecutive,
    });
  }

  // clear_streak: 3+ clear days in a row
  let maxClearStreak = 0;
  let currentClear = 0;
  for (const log of sorted) {
    if (log.skin_status === 'clear') {
      currentClear++;
      if (currentClear > maxClearStreak) maxClearStreak = currentClear;
    } else {
      currentClear = 0;
    }
  }
  if (maxClearStreak >= 3) {
    findings.push({
      rule: 'clear_streak',
      confidence: confidenceFromCount(maxClearStreak),
      matchCount: maxClearStreak,
    });
  }

  return findings;
}

export function getPrediction(logs: InsightLog[]): PredictionState {
  if (logs.length < 2) return 'neutral';
  const sorted = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const last2 = sorted.slice(0, 2);
  const allFlare = last2.every((l) => l.skin_status === 'flare');
  const stressRecent = last2.some((l) => l.quick_tags.includes('stress'));
  if (allFlare || stressRecent) return 'elevated';
  const allClear = last2.every((l) => l.skin_status === 'clear');
  if (allClear) return 'stable';
  return 'neutral';
}
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 3: Commit**

```bash
git add lib/insights/engine.ts
git commit -m "feat: add Layer 1 rule engine (getFindings, getPrediction)"
```

---

## Task 3: Layer 2 — Dermatologist Context + AI Copy Generator

**Files:**
- Create: `lib/insights/dermatologist-context.ts`
- Create: `lib/insights/copy-generator.ts`

- [ ] **Step 1: Create `lib/insights/dermatologist-context.ts`**

```typescript
// v1→v2 boundary: replace this export with an async RAG retrieval function
// to migrate to the knowledge base approach without changing copy-generator.ts.
export const dermatologistContext = `You are a knowledgeable eczema care assistant helping users understand patterns in their own symptom logs. You have deep knowledge of atopic dermatitis triggers, the skin barrier, and the relationship between lifestyle factors and flare-ups.

STRICT RULES — violating any of these is unacceptable:
- Never use the words "diagnose", "treat", "cure", or "prescribe"
- Always hedge your language: use "may", "appears to", "based on your logs", "seems to"
- Never claim a causal relationship — only correlational observations
- Each insight card must be 1–2 sentences maximum
- The prediction card subtext must be 1 sentence maximum
- Do not mention specific medications, dosages, or treatments
- Always end insight cards with the phrase: "Consult your dermatologist for guidance."

TONE: warm, encouraging, non-judgmental. This user has a chronic condition and may feel frustrated or guilty. Your language should make them feel understood, not alarmed.

CONTEXT: You will receive a JSON object with findings from a rule engine. Each finding has a rule name, confidence level, match count, and optional supporting data. Generate natural-language copy for each finding and (if present) a prediction.`;
```

- [ ] **Step 2: Create `lib/insights/copy-generator.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { dermatologistContext } from "./dermatologist-context";
import type { Finding, PredictionState } from "./engine";

export interface InsightCopy {
  insights: Array<{ rule: Finding["rule"]; copy: string }>;
  prediction: string | null;
}

const CACHE_TYPE = "home_insights";

export async function getOrGenerateInsightCopy(
  userId: string,
  findings: Finding[],
  prediction: PredictionState,
): Promise<InsightCopy> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: cached } = await supabase
    .from("ai_analyses")
    .select("result")
    .eq("user_id", userId)
    .eq("analysis_type", CACHE_TYPE)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.result) {
    try {
      return JSON.parse(cached.result) as InsightCopy;
    } catch {
      // stale / malformed cache — fall through to regenerate
    }
  }

  const copy = await generateCopy(findings, prediction);

  await supabase.from("ai_analyses").insert({
    user_id: userId,
    analysis_type: CACHE_TYPE,
    input_summary: { findings, prediction } as unknown as import("@/lib/supabase/types").Json,
    result: JSON.stringify(copy),
    model: "claude-sonnet-4-6",
  });

  return copy;
}

async function generateCopy(
  findings: Finding[],
  prediction: PredictionState,
): Promise<InsightCopy> {
  const client = new Anthropic();

  const userMessage = `Here are the findings from the rule engine:

${JSON.stringify({ findings, prediction }, null, 2)}

For each finding, write a 1–2 sentence insight card in natural language. End each insight with "Consult your dermatologist for guidance."

For the prediction (if not "neutral"), write a 1-sentence subtext for the prediction card.

Respond in this exact JSON format:
{
  "insights": [
    { "rule": "<rule_name>", "copy": "<1-2 sentence copy>" }
  ],
  "prediction": "<1 sentence or null>"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: dermatologistContext,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    message.content[0]?.type === "text" ? message.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { insights: [], prediction: null };
  }

  try {
    return JSON.parse(jsonMatch[0]) as InsightCopy;
  } catch {
    return { insights: [], prediction: null };
  }
}
```

- [ ] **Step 3: Verify types compile**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 4: Commit**

```bash
git add lib/insights/dermatologist-context.ts lib/insights/copy-generator.ts
git commit -m "feat: add Layer 2 AI copy generator with daily cache"
```

---

## Task 4: Quick-Log Server Actions

**Files:**
- Create: `app/(app)/log/quick-actions.ts`

- [ ] **Step 1: Create `app/(app)/log/quick-actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SkinStatus } from "@/lib/insights/engine";

type QuickStatusResult =
  | { success: true; logId: string }
  | { error: string };

type QuickTagsResult = { success: true } | { error: string };

function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function saveQuickStatus(
  status: SkinStatus,
): Promise<QuickStatusResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  const log_date = todayLocalDate();

  const { data, error } = await supabase
    .from("daily_logs")
    .upsert(
      { user_id: user.id, log_date, skin_status: status },
      { onConflict: "user_id,log_date" },
    )
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save status." };
  }

  revalidatePath("/home");
  revalidatePath("/history");
  return { success: true, logId: data.id };
}

export async function saveQuickTags(
  logDate: string,
  tags: string[],
  stressLevel: number | null,
  foods: string[],
): Promise<QuickTagsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  const updatePayload: Record<string, unknown> = { quick_tags: tags };
  if (stressLevel !== null) updatePayload.stress_level = stressLevel;

  const { data: log, error: updateError } = await supabase
    .from("daily_logs")
    .update(updatePayload)
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .select("id")
    .single();

  if (updateError || !log) {
    return { error: updateError?.message ?? "Could not save tags." };
  }

  if (foods.length > 0) {
    const { error: foodError } = await supabase.from("food_entries").insert(
      foods.map((food_name) => ({ log_id: log.id, food_name })),
    );
    if (foodError) return { error: foodError.message };
  }

  revalidatePath("/home");
  revalidatePath("/history");
  revalidatePath("/log");
  return { success: true };
}
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/log/quick-actions.ts
git commit -m "feat: add saveQuickStatus and saveQuickTags server actions"
```

---

## Task 5: Week Strip Shared Component

**Files:**
- Create: `components/week-strip.tsx`

This component is used on both the Home page and the History page. It shows Mon–Sun for the current week (or a given 7-day window). Days with no entry show a dimmed `—`.

- [ ] **Step 1: Create `components/week-strip.tsx`**

```typescript
const SKIN_EMOJI: Record<string, string> = {
  clear: "👍",
  mild: "😐",
  flare: "🔥",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayData {
  date: string; // YYYY-MM-DD
  skinStatus: "clear" | "mild" | "flare" | null;
}

interface WeekStripProps {
  days: DayData[];
  showLabels?: boolean;
}

export function WeekStrip({ days, showLabels = true }: WeekStripProps) {
  return (
    <div className="flex gap-1.5 items-end justify-between">
      {days.map((day, i) => {
        const emoji = day.skinStatus ? SKIN_EMOJI[day.skinStatus] : null;
        return (
          <div
            key={day.date}
            className="flex flex-1 flex-col items-center gap-1"
            style={{ opacity: emoji ? 1 : 0.3 }}
          >
            <span className="text-xl leading-none" aria-label={day.skinStatus ?? "no entry"}>
              {emoji ?? "—"}
            </span>
            {showLabels && (
              <span className="text-[9px] font-semibold text-muted-foreground">
                {DAY_LABELS[i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Builds a 7-element DayData array for Mon–Sun of the week containing `today`.
 * `logsByDate` is a Map from YYYY-MM-DD to skin status.
 */
export function buildWeekDays(
  today: string,
  logsByDate: Map<string, "clear" | "mild" | "flare">,
): DayData[] {
  const [y, m, d] = today.split("-").map(Number);
  const todayDate = new Date(y!, (m ?? 1) - 1, d ?? 1);
  // ISO week starts Monday; JS getDay() is 0=Sun
  const jsDay = todayDate.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(todayDate);
  monday.setDate(monday.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const iso = date.toISOString().slice(0, 10);
    return { date: iso, skinStatus: logsByDate.get(iso) ?? null };
  });
}
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 3: Commit**

```bash
git add components/week-strip.tsx
git commit -m "feat: add WeekStrip shared component with buildWeekDays helper"
```

---

## Task 6: Quick-Log Form Component

**Files:**
- Create: `components/quick-log-form.tsx`

4-step client component. Step 1 calls `saveQuickStatus` immediately on tap. Steps 2–4 are progressive. "Add more detail" links to the existing log form.

- [ ] **Step 1: Create `components/quick-log-form.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuickStatus, saveQuickTags } from "@/app/(app)/log/quick-actions";
import type { SkinStatus } from "@/lib/insights/engine";

const CHIP_OPTIONS = [
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "stress", label: "Stress", emoji: "😰" },
  { id: "poor_sleep", label: "Poor sleep", emoji: "😴" },
  { id: "new_product", label: "New product", emoji: "🧴" },
  { id: "weather", label: "Weather", emoji: "🌦" },
] as const;

type ChipId = (typeof CHIP_OPTIONS)[number]["id"];

interface QuickLogFormProps {
  recentFoods: string[];
  insightCopy: string | null;
  todayLogDate: string;
  todayStatus: SkinStatus | null;
  todayTags: string[];
}

export function QuickLogForm({
  recentFoods,
  insightCopy,
  todayLogDate,
  todayStatus,
  todayTags,
}: QuickLogFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => {
    if (todayStatus !== null) return 4;
    return 1;
  });
  const [savedDate, setSavedDate] = useState<string>(todayLogDate);
  const [selectedStatus, setSelectedStatus] = useState<SkinStatus | null>(todayStatus);
  const [selectedChips, setSelectedChips] = useState<Set<ChipId>>(
    () => new Set(todayTags as ChipId[]),
  );
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
  const [newFood, setNewFood] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleStatusTap(status: SkinStatus) {
    setSelectedStatus(status);
    const result = await saveQuickStatus(status);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSavedDate(todayLogDate);
    setStep(2);
  }

  function toggleChip(chip: ChipId) {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }

  function handleChipsDone() {
    const needsStep3 =
      selectedChips.has("stress") || selectedChips.has("food");
    if (needsStep3) setStep(3);
    else handleFinish([...selectedChips]);
  }

  function handleFinish(tags: string[]) {
    startTransition(async () => {
      const stressVal = tags.includes("stress") ? stressLevel : null;
      const foodList = tags.includes("food") ? [...selectedFoods] : [];
      const result = await saveQuickTags(savedDate, tags, stressVal, foodList);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStep(4);
    });
  }

  function addFood() {
    const trimmed = newFood.trim();
    if (!trimmed) return;
    setSelectedFoods((prev) => new Set([...prev, trimmed]));
    setNewFood("");
  }

  if (step === 1) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <h1 className="text-2xl font-black text-center leading-tight tracking-tight">
          How is your skin today?
        </h1>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {(
            [
              { status: "clear" as const, emoji: "👍", label: "Clear" },
              { status: "mild" as const, emoji: "😐", label: "Mild" },
              { status: "flare" as const, emoji: "🔥", label: "Flare" },
            ] as const
          ).map(({ status, emoji, label }) => (
            <button
              key={status}
              onClick={() => handleStatusTap(status)}
              disabled={isPending}
              className="flex items-center justify-center gap-3 rounded-full border-2 border-border bg-background py-4 text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              <span>{emoji}</span> {label}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <p className="text-xs text-muted-foreground">Tap to select. That's it.</p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex flex-col gap-5 py-6">
        <h2 className="text-xl font-black text-center">Anything notable?</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {CHIP_OPTIONS.map((chip) => {
            const active = selectedChips.has(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => toggleChip(chip.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold border-2 transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <span>{chip.emoji}</span> {chip.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleChipsDone}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Done →
          </button>
          <button
            onClick={() => handleFinish([])}
            className="py-2 text-sm font-semibold text-muted-foreground"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const hasStress = selectedChips.has("stress");
    const hasFood = selectedChips.has("food");
    return (
      <div className="flex flex-col gap-5 py-6">
        {hasStress && (
          <div className="space-y-3">
            <h2 className="text-lg font-black">How stressful was today?</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={stressLevel}
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        )}
        {hasFood && (
          <div className="space-y-3">
            <h2 className="text-lg font-black">Recent foods?</h2>
            <div className="flex flex-col gap-2">
              {recentFoods.map((food) => (
                <button
                  key={food}
                  onClick={() =>
                    setSelectedFoods((prev) => {
                      const next = new Set(prev);
                      if (next.has(food)) next.delete(food);
                      else next.add(food);
                      return next;
                    })
                  }
                  className={`rounded-full border-2 px-4 py-2 text-sm font-semibold text-left transition-colors ${
                    selectedFoods.has(food)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {food}
                </button>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFood}
                  onChange={(e) => setNewFood(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFood()}
                  placeholder="+ Add food…"
                  className="flex-1 rounded-full border-2 border-border bg-background px-4 py-2 text-sm font-semibold outline-none focus:border-primary"
                />
                {newFood && (
                  <button
                    onClick={addFood}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => handleFinish([...selectedChips])}
          disabled={isPending}
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          Done →
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Step 4 — done state
  const copyText =
    insightCopy ?? "We're starting to detect patterns.";
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary text-2xl">
        ✅
      </div>
      <h2 className="text-2xl font-black">Logged</h2>
      <div className="rounded-2xl border border-primary bg-primary/10 px-5 py-4 max-w-xs">
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          {copyText}
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
        <a
          href="/log?detail=1"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background text-center"
        >
          Add more detail →
        </a>
        <button
          onClick={() => router.push("/home")}
          className="py-2 text-sm font-semibold text-muted-foreground"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 3: Commit**

```bash
git add components/quick-log-form.tsx
git commit -m "feat: add QuickLogForm 4-step client component"
```

---

## Task 7: More Panel + Bottom Nav Update

**Files:**
- Create: `components/more-panel.tsx`
- Modify: `components/bottom-nav.tsx`

- [ ] **Step 1: Create `components/more-panel.tsx`**

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Calendar, Cpu, MoreHorizontal, Trophy, User, Zap } from "lucide-react";

const MORE_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, caption: "Trends & charts" },
  { href: "/you", label: "You", icon: User, caption: "Profile & streaks" },
  { href: "/calendar", label: "Calendar", icon: Calendar, caption: "Monthly view" },
  { href: "/milestones", label: "Milestones", icon: Trophy, caption: "Achievements" },
  { href: "/routines", label: "Routines", icon: Zap, caption: "Skincare routines" },
  { href: "/analyses", label: "AI Analysis", icon: Cpu, caption: "Deep analysis" },
] as const;

export function MoreButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="More"
        className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <MoreHorizontal className="size-5" aria-hidden />
        <span>More</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[480px] mx-auto rounded-t-3xl bg-background border border-border pb-[env(safe-area-inset-bottom)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <div className="px-5 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground py-3">
                More
              </h2>
              <div className="flex flex-col gap-1">
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-accent transition-colors"
                  >
                    <link.icon className="size-5 text-muted-foreground shrink-0" aria-hidden />
                    <div>
                      <div className="text-sm font-semibold">{link.label}</div>
                      <div className="text-xs text-muted-foreground">{link.caption}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Rewrite `components/bottom-nav.tsx`**

Replace the entire file with the new 3-tab + More layout:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreButton } from "./more-panel";

const leftTabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/history", label: "History", icon: History },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const logActive = pathname === "/log" || pathname.startsWith("/log/");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="relative mx-auto flex w-full max-w-[480px] items-stretch justify-between px-2 py-2">
        <div className="flex flex-1 items-stretch justify-around gap-1">
          {leftTabs.map((tab) => (
            <NavTab key={tab.href} pathname={pathname} {...tab} />
          ))}
        </div>

        <div className="w-20" aria-hidden />

        <div className="flex flex-1 items-stretch justify-around gap-1">
          <MoreButton />
        </div>

        <Link
          href="/log"
          aria-label="Log today"
          aria-current={logActive ? "page" : undefined}
          className={cn(
            "absolute left-1/2 top-0 flex size-14 -translate-x-1/2 -translate-y-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-[1.05] active:scale-95",
            logActive && "ring-4 ring-primary/30",
          )}
        >
          <Plus className="size-6" strokeWidth={3} aria-hidden />
        </Link>
      </div>
    </nav>
  );
}

function NavTab({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck
pnpm lint
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/more-panel.tsx components/bottom-nav.tsx
git commit -m "feat: replace 4-tab nav with 3-tab + More panel bottom sheet"
```

---

## Task 8: Log Page Replacement

**Files:**
- Modify: `app/(app)/log/page.tsx`

The log page now serves two modes: `?detail=1` renders the existing `LogForm`, default renders `QuickLogForm`.

- [ ] **Step 1: Read the current log page**

Read `app/(app)/log/page.tsx` to understand current imports and structure before modifying.

- [ ] **Step 2: Rewrite `app/(app)/log/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { QuickLogForm } from "@/components/quick-log-form";
import { LogForm } from "@/components/log-form";
import { getFindings } from "@/lib/insights/engine";
import type { InsightLog, InsightFood } from "@/lib/insights/engine";

function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>;
}) {
  const { detail } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = todayLocalDate();

  if (detail === "1") {
    // Render existing detail form
    return <LogForm />;
  }

  // Fetch today's log status and tags
  const { data: todayLog } = await supabase
    .from("daily_logs")
    .select("skin_status, quick_tags")
    .eq("user_id", user.id)
    .eq("log_date", today)
    .maybeSingle();

  // Fetch recent foods for step 3
  const { data: recentFoodRows } = await supabase
    .from("food_entries")
    .select("food_name, daily_logs!inner(user_id)")
    .eq("daily_logs.user_id", user.id)
    .order("food_name", { ascending: true })
    .limit(20);

  const recentFoods = [
    ...new Set((recentFoodRows ?? []).map((f) => f.food_name)),
  ];

  // Get best Layer 1 insight for done state
  const { data: logRows } = await supabase
    .from("daily_logs")
    .select("log_date, skin_status, quick_tags, stress_level, itch_level")
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .limit(30);

  const insightLogs: InsightLog[] = (logRows ?? []).map((l) => ({
    log_date: l.log_date,
    skin_status: l.skin_status as InsightLog["skin_status"],
    quick_tags: l.quick_tags ?? [],
    stress_level: l.stress_level,
    itch_level: l.itch_level,
  }));

  const { data: foodRows } = await supabase
    .from("food_entries")
    .select("food_name, daily_logs!inner(log_date, user_id)")
    .eq("daily_logs.user_id", user.id);

  const insightFoods: InsightFood[] = (foodRows ?? []).map((f) => ({
    food_name: f.food_name,
    log_date: (f.daily_logs as { log_date: string }).log_date,
  }));

  const findings = getFindings(insightLogs, insightFoods);
  const topFinding = findings.sort((a, b) => b.matchCount - a.matchCount)[0];

  const insightCopyMap: Record<string, string> = {
    stress_flare: "Stress may be affecting your skin based on your logs. Consult your dermatologist for guidance.",
    sleep_flare: "Poor sleep appears to be linked to flare-ups in your logs. Consult your dermatologist for guidance.",
    food_flare: topFinding?.supportingData
      ? `${topFinding.supportingData}. Consult your dermatologist for guidance.`
      : "Certain foods may be connected to your flares. Consult your dermatologist for guidance.",
    consecutive_flares: "You've had several flare days recently — tracking consistently will help identify the cause. Consult your dermatologist for guidance.",
    clear_streak: "Your skin has been clear lately — keep noting what's been different! Consult your dermatologist for guidance.",
  };

  const insightCopy = topFinding ? (insightCopyMap[topFinding.rule] ?? null) : null;

  return (
    <QuickLogForm
      recentFoods={recentFoods}
      insightCopy={insightCopy}
      todayLogDate={today}
      todayStatus={(todayLog?.skin_status as InsightLog["skin_status"]) ?? null}
      todayTags={todayLog?.quick_tags ?? []}
    />
  );
}
```

- [ ] **Step 3: Check if `LogForm` is exported from `components/log-form.tsx`**

Run:
```bash
grep -n "export" components/log-form.tsx | head -5
```

If the component is not named `LogForm` or not in that file, adjust the import in `app/(app)/log/page.tsx` to match the actual export. The existing log form component may be named differently — check with:
```bash
ls components/ | grep -i log
```

- [ ] **Step 4: Verify**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/log/page.tsx
git commit -m "feat: replace log page with QuickLogForm; existing form at ?detail=1"
```

---

## Task 9: Home Page Rebuild

**Files:**
- Modify: `app/(app)/home/page.tsx`

- [ ] **Step 1: Rewrite `app/(app)/home/page.tsx`**

```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WeekStrip, buildWeekDays } from "@/components/week-strip";
import { getFindings, getPrediction } from "@/lib/insights/engine";
import { getOrGenerateInsightCopy } from "@/lib/insights/copy-generator";
import type { InsightLog, InsightFood } from "@/lib/insights/engine";

function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const CONFIDENCE_LABELS: Record<string, string> = {
  possible: "possible",
  likely: "likely",
  strong: "strong",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "there";
  const today = new Date().toISOString().slice(0, 10);

  const { data: logRows } = await supabase
    .from("daily_logs")
    .select("id, log_date, skin_status, quick_tags, stress_level, itch_level")
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .limit(30);

  const insightLogs: InsightLog[] = (logRows ?? []).map((l) => ({
    log_date: l.log_date,
    skin_status: l.skin_status as InsightLog["skin_status"],
    quick_tags: l.quick_tags ?? [],
    stress_level: l.stress_level,
    itch_level: l.itch_level,
  }));

  const { data: foodRows } = await supabase
    .from("food_entries")
    .select("food_name, daily_logs!inner(log_date, user_id)")
    .eq("daily_logs.user_id", user.id);

  const insightFoods: InsightFood[] = (foodRows ?? []).map((f) => ({
    food_name: f.food_name,
    log_date: (f.daily_logs as { log_date: string }).log_date,
  }));

  const todayLog = insightLogs.find((l) => l.log_date === today);
  const totalLogs = insightLogs.length;

  const findings = getFindings(insightLogs, insightFoods);
  const prediction = getPrediction(insightLogs);

  let insightCopy = null;
  if (findings.length > 0) {
    insightCopy = await getOrGenerateInsightCopy(user.id, findings, prediction);
  }

  // Build week strip data
  const logsByDate = new Map<string, "clear" | "mild" | "flare">();
  for (const l of insightLogs) {
    if (l.skin_status) logsByDate.set(l.log_date, l.skin_status);
  }
  const weekDays = buildWeekDays(today, logsByDate);

  // Week summary stats
  const weekStatuses = weekDays.map((d) => d.skinStatus).filter(Boolean) as string[];
  const flareCount = weekStatuses.filter((s) => s === "flare").length;
  const mildCount = weekStatuses.filter((s) => s === "mild").length;
  const clearCount = weekStatuses.filter((s) => s === "clear").length;
  const bestDay = weekDays.find((d) => d.skinStatus === "clear");
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const bestDayLabel = bestDay
    ? DAY_NAMES[weekDays.indexOf(bestDay)] ?? null
    : null;

  const SKIN_STATUS_LABELS: Record<string, string> = {
    clear: "Clear",
    mild: "Mild",
    flare: "Flare",
  };

  return (
    <div className="space-y-5">
      {/* 1. Greeting */}
      <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
        {greeting(new Date().getHours())}, {firstName}
      </h1>

      {/* 2. Last check-in card */}
      {todayLog ? (
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Today ·{" "}
              {todayLog.skin_status
                ? SKIN_STATUS_LABELS[todayLog.skin_status]
                : "Logged"}
            </span>
            <Link
              href="/log"
              className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Edit →
            </Link>
          </div>
          {todayLog.quick_tags && todayLog.quick_tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {todayLog.quick_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
                >
                  {tag.replace("_", " ")}
                </span>
              ))}
            </div>
          )}
        </section>
      ) : (
        <Link
          href="/log"
          className="flex items-center justify-between rounded-3xl bg-primary p-5 text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-base font-bold">Log today</span>
          <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-sm font-bold text-primary-foreground">
            Quick check-in →
          </span>
        </Link>
      )}

      {/* 3. Your Skin Patterns */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Your Skin Patterns
        </h2>
        {totalLogs < 3 ? (
          <p className="rounded-3xl border border-dashed border-border p-5 text-sm font-medium text-muted-foreground">
            {totalLogs === 0
              ? "Log once to start discovering patterns"
              : `Log ${3 - totalLogs} more day${3 - totalLogs === 1 ? "" : "s"} to unlock your first pattern`}
          </p>
        ) : findings.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-5 text-sm font-medium text-muted-foreground">
            Keep logging — patterns will appear soon.
          </p>
        ) : (
          <div className="space-y-3">
            {findings.slice(0, 3).map((finding) => {
              const copy = insightCopy?.insights.find(
                (i) => i.rule === finding.rule,
              )?.copy;
              return (
                <div
                  key={finding.rule}
                  className="rounded-3xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-relaxed">
                      {copy ?? "Pattern detected in your logs."}
                    </p>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {CONFIDENCE_LABELS[finding.confidence]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Tomorrow's Forecast */}
      {totalLogs >= 2 && prediction !== "neutral" && (
        <section
          className="rounded-3xl p-5 text-white"
          style={{ background: "#163300" }}
        >
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-60">
            Tomorrow's Forecast
          </h2>
          <p className="mt-2 text-lg font-black">
            {prediction === "elevated"
              ? "⚠️ Elevated risk"
              : "✅ Skin likely stable"}
          </p>
          {insightCopy?.prediction && (
            <p className="mt-1 text-sm opacity-70">
              {insightCopy.prediction}
            </p>
          )}
        </section>
      )}

      {/* 5. This Week */}
      <section className="rounded-3xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          This Week
        </h2>
        <WeekStrip days={weekDays} showLabels />
        {weekStatuses.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
            {flareCount > 0 && <span>{flareCount} flare</span>}
            {mildCount > 0 && <span>{mildCount} mild</span>}
            {clearCount > 0 && <span>{clearCount} clear</span>}
            {bestDayLabel && (
              <span className="text-primary">Best day: {bestDayLabel}</span>
            )}
          </div>
        )}
      </section>

      {/* 6. Disclaimer */}
      <p className="px-2 text-xs font-medium text-muted-foreground">
        Not medical advice. Consult your dermatologist.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm build
```

Expected: zero TS errors and successful build.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/home/page.tsx
git commit -m "feat: rebuild Home page with patterns, prediction, week strip"
```

---

## Task 10: History Page Rebuild

**Files:**
- Create: `components/history-list.tsx`
- Modify: `app/(app)/history/page.tsx`

The server page fetches data; `HistoryList` handles collapsible expand/collapse on the client.

- [ ] **Step 1: Create `components/history-list.tsx`**

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";

interface HistoryEntry {
  id: string;
  log_date: string;
  skin_status: "clear" | "mild" | "flare" | null;
  quick_tags: string[];
  itch_level: number | null;
  sleep_hours: number | null;
  stress_level: number | null;
  notes: string | null;
}

interface HistoryListProps {
  entries: HistoryEntry[];
}

const SKIN_EMOJI: Record<string, string> = {
  clear: "👍",
  mild: "😐",
  flare: "🔥",
};

const TAG_EMOJI: Record<string, string> = {
  stress: "😰 Stress",
  poor_sleep: "😴 Poor sleep",
  food: "🍜 Food",
  new_product: "🧴 New product",
  weather: "🌦 Weather",
};

function formatLogDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function HistoryList({ entries }: HistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
        Log once to start discovering patterns
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const emoji = entry.skin_status ? SKIN_EMOJI[entry.skin_status] : "—";
        const tagLabels = entry.quick_tags
          .map((t) => TAG_EMOJI[t] ?? t)
          .join(" · ");

        return (
          <div
            key={entry.id}
            className={`rounded-2xl border overflow-hidden transition-colors ${
              isExpanded ? "border-primary" : "border-border bg-card"
            }`}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              aria-expanded={isExpanded}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground">
                  {formatLogDate(entry.log_date)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {tagLabels || "No tags"}
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {isExpanded ? "↑" : "↓"}
              </span>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2">
                {entry.itch_level != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Itch</span>
                    <span className="font-bold">{entry.itch_level}/10</span>
                  </div>
                )}
                {entry.stress_level != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Stress level</span>
                    <span className="font-bold">
                      {entry.stress_level <= 3
                        ? "Low"
                        : entry.stress_level <= 6
                          ? "Medium"
                          : "High"}
                    </span>
                  </div>
                )}
                {entry.sleep_hours != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Sleep</span>
                    <span className="font-bold">{entry.sleep_hours}h</span>
                  </div>
                )}
                {entry.notes && (
                  <p className="text-xs text-foreground/80 pt-1">{entry.notes}</p>
                )}
                <Link
                  href={`/log?detail=1`}
                  className="inline-block mt-2 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  Edit →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `app/(app)/history/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { WeekStrip, buildWeekDays } from "@/components/week-strip";
import { HistoryList } from "@/components/history-list";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);

  const { data: logRows } = await supabase
    .from("daily_logs")
    .select(
      "id, log_date, skin_status, quick_tags, itch_level, sleep_hours, stress_level, notes",
    )
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .limit(90);

  const logs = logRows ?? [];

  const logsByDate = new Map<string, "clear" | "mild" | "flare">();
  for (const l of logs) {
    if (l.skin_status) {
      logsByDate.set(l.log_date, l.skin_status as "clear" | "mild" | "flare");
    }
  }
  const weekDays = buildWeekDays(today, logsByDate);

  const entries = logs.map((l) => ({
    id: l.id,
    log_date: l.log_date,
    skin_status: l.skin_status as "clear" | "mild" | "flare" | null,
    quick_tags: l.quick_tags ?? [],
    itch_level: l.itch_level,
    sleep_hours: l.sleep_hours ? Number(l.sleep_hours) : null,
    stress_level: l.stress_level,
    notes: l.notes,
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
        History
      </h1>

      <section className="rounded-3xl border border-border bg-card p-4 space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Last 7 days
        </span>
        <WeekStrip days={weekDays} showLabels />
      </section>

      <HistoryList entries={entries} />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 4: Commit**

```bash
git add components/history-list.tsx app/\(app\)/history/page.tsx
git commit -m "feat: rebuild History page with week strip + collapsible log list"
```

---

## Task 11: Onboarding Flow

**Files:**
- Create: `components/onboarding-flow.tsx`
- Create: `app/onboarding/page.tsx`

`/onboarding` is at the root app level (NOT inside `app/(app)/`) so the `(app)` layout's redirect gate can send users here without triggering a loop.

- [ ] **Step 1: Create `components/onboarding-flow.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuickStatus } from "@/app/(app)/log/quick-actions";
import { markOnboarded } from "@/app/onboarding/actions";
import type { SkinStatus } from "@/lib/insights/engine";

export function OnboardingFlow() {
  const router = useRouter();
  const [screen, setScreen] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleFirstLog(status: SkinStatus) {
    startTransition(async () => {
      const [statusResult, onboardResult] = await Promise.all([
        saveQuickStatus(status),
        markOnboarded(),
      ]);
      if ("error" in statusResult) { setError(statusResult.error); return; }
      if ("error" in onboardResult) { setError(onboardResult.error); return; }
      router.push("/log");
    });
  }

  if (screen === 1) {
    return (
      <div
        className="min-h-screen flex flex-col justify-between p-8"
        style={{ background: "#163300" }}
      >
        <div className="pt-12">
          <div className="text-5xl mb-6">🔍</div>
          <h1 className="text-3xl font-black text-white leading-tight mb-4">
            Let's figure out what's triggering your eczema
          </h1>
          <p className="text-white/60 text-base">
            No long tracking. Just quick check-ins.
          </p>
        </div>
        <button
          onClick={() => setScreen(2)}
          className="w-full rounded-full py-4 font-bold text-base"
          style={{ background: "#9fe870", color: "#163300" }}
        >
          Continue →
        </button>
      </div>
    );
  }

  if (screen === 2) {
    return (
      <div className="min-h-screen flex flex-col justify-between p-8 bg-background">
        <div className="pt-12">
          <div className="text-5xl mb-6">😌</div>
          <h1 className="text-3xl font-black leading-tight mb-4">
            You don't need to be consistent
          </h1>
          <p className="text-muted-foreground text-base mb-6">
            Even occasional logs help us find patterns. No streaks to maintain.
            No guilt.
          </p>
          <div className="rounded-2xl border border-primary bg-primary/10 p-4">
            <p className="text-sm font-semibold text-foreground">
              "Even small inputs help"
            </p>
          </div>
        </div>
        <button
          onClick={() => setScreen(3)}
          className="w-full rounded-full bg-primary py-4 font-bold text-base text-primary-foreground"
        >
          Got it →
        </button>
      </div>
    );
  }

  if (screen === 3) {
    return (
      <div className="min-h-screen flex flex-col justify-between p-8 bg-background">
        <div className="pt-12">
          <h1 className="text-3xl font-black leading-tight mb-8">
            How it works
          </h1>
          <div className="flex flex-col gap-5">
            {[
              "Tap how your skin feels",
              "Add quick context (optional)",
              "We detect your patterns",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-full font-black text-sm"
                  style={{ background: "#9fe870", color: "#163300" }}
                >
                  {i + 1}
                </div>
                <p className="text-base font-semibold pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => setScreen(4)}
          className="w-full rounded-full bg-primary py-4 font-bold text-base text-primary-foreground"
        >
          Next →
        </button>
      </div>
    );
  }

  if (screen === 4) {
    return (
      <div className="min-h-screen flex flex-col justify-between p-8 bg-background">
        <div className="pt-12">
          <div className="text-5xl mb-6">🧠</div>
          <h1 className="text-3xl font-black leading-tight mb-4">
            Most users discover their top trigger within 7 days
          </h1>
          <p className="text-muted-foreground text-base">
            Stress, food, sleep — patterns emerge faster than you'd think.
          </p>
        </div>
        <button
          onClick={() => setScreen(5)}
          className="w-full rounded-full bg-primary py-4 font-bold text-base text-primary-foreground"
        >
          Let's go →
        </button>
      </div>
    );
  }

  // Screen 5 — first log
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 bg-background"
      style={{ border: "2px solid #9fe870" }}
    >
      <h1 className="text-2xl font-black text-center mb-8">
        How is your skin today?
      </h1>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {(
          [
            { status: "clear" as const, emoji: "👍", label: "Clear" },
            { status: "mild" as const, emoji: "😐", label: "Mild" },
            { status: "flare" as const, emoji: "🔥", label: "Flare" },
          ] as const
        ).map(({ status, emoji, label }) => (
          <button
            key={status}
            onClick={() => handleFirstLog(status)}
            disabled={isPending}
            className="flex items-center justify-center gap-3 rounded-full border-2 border-border bg-background py-4 text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            <span>{emoji}</span> {label}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <p className="mt-6 text-xs text-muted-foreground">
        Your first log. Takes 2 seconds.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/onboarding/actions.ts`**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { success: true } | { error: string };

export async function markOnboarded(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ has_onboarded: true })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
```

- [ ] **Step 3: Create `app/onboarding/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding-flow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.has_onboarded) redirect("/home");

  return <OnboardingFlow />;
}
```

- [ ] **Step 4: Verify**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 5: Commit**

```bash
git add components/onboarding-flow.tsx app/onboarding/page.tsx app/onboarding/actions.ts
git commit -m "feat: add 5-screen onboarding flow with first-log capture"
```

---

## Task 12: Layout Onboarding Gate

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Add the onboarding gate to `app/(app)/layout.tsx`**

After the existing `if (!user) redirect("/login")` check, add a check for `has_onboarded`:

```typescript
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && profile.has_onboarded === false) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-[480px] flex-1 px-5 pt-4 pb-28">
        {children}
      </main>
      <PwaInstallPrompt />
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

```bash
pnpm build
```

Expected: zero TS errors, successful build. If there are type errors about `has_onboarded` not existing on the profile type, check that Task 1 Step 4 was completed (types update).

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "feat: add onboarding gate to app layout — redirect new users to /onboarding"
```

---

## Task 13: Final Verification + Polish

- [ ] **Step 1: Run full type check and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: zero errors.

- [ ] **Step 2: Run production build**

```bash
pnpm build
```

Expected: successful build, zero TS errors, no missing module errors.

- [ ] **Step 3: Verify mobile layout at 375px**

Start the dev server and open Chrome DevTools → Device Toolbar set to 375px width. Check:
- Home page: greeting, last check-in card, patterns section, week strip all render without horizontal scroll
- Log page: quick-log step 1 buttons are large enough to tap
- History page: 7-day strip + collapsible list fit within 375px
- Bottom nav: 3 tabs + More fit without clipping
- More panel: slides up and all 6 links are visible

- [ ] **Step 4: Smoke test quick-log flow**

1. Open `/log` → see step 1 (skin status buttons)
2. Tap "Flare" → step 2 appears (chip selector)
3. Select "Stress" and "Food" → tap Done
4. Step 3 appears: stress slider + food list
5. Tap Done → step 4 appears with ✅ Logged
6. Tap "Go home" → redirected to `/home`
7. Home page shows "Today · Flare" in last check-in card

- [ ] **Step 5: Verify `pnpm build` + push**

```bash
pnpm build && git push
```

---

## Definition of Done

- [ ] `pnpm build` passes, zero TS errors
- [ ] `pnpm lint` passes
- [ ] Quick-log saves `skin_status` + `quick_tags` to Supabase on step 1 tap
- [ ] Home patterns section shows empty state for <3 logs; shows AI copy for ≥3 logs
- [ ] Prediction card absent when <2 logs; correct state for ≥2 logs
- [ ] Onboarding shows for new users (`has_onboarded = false`), skipped for existing
- [ ] More panel opens and all 6 existing pages are reachable
- [ ] History: missed days not shown in list; dimmed `—` in 7-day strip
- [ ] Mobile layout verified at 375px
