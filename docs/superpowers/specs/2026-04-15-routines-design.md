# Curated Routines — Design Spec

**Date:** 2026-04-15  
**Session:** 10  
**Status:** Approved

---

## Overview

A curated library of step-by-step eczema management protocols. Users browse all routines and save favourites to Supabase. Read-only reference content — no step completion tracking. Accessed via the You tab's "Community routines" PreviewCard.

---

## Data Model

### Static content — `content/routines.ts`

```ts
interface RoutineStep {
  title: string
  description: string
}

interface Routine {
  id: string            // e.g. "morning-flare-protocol"
  title: string
  intro: string         // when/why to use this routine
  estimatedMinutes: number
  category: "skincare" | "lifestyle" | "flare" | "sleep" | "exercise" | "travel"
  steps: RoutineStep[]
  source: string
  sourceUrl: string
}
```

Seed with 6–8 routines covering: morning maintenance, evening wind-down, flare day, post-exercise, winter dry air, travel, wet wrap therapy, antipruritic sleep.

### Supabase — `saved_routines` table

```sql
CREATE TABLE saved_routines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  routine_id  text NOT NULL,
  saved_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, routine_id)
);

ALTER TABLE saved_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own saved routines" ON saved_routines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## Pages

### `/routines` — List page (Server Component)

- Fetches `saved_routines` rows for the current user → builds a `Set<string>` of saved IDs
- Renders all routines from `content/routines.ts` as cards
- Each card: category pill, title, estimated time, bookmark icon (filled if saved)
- Cards link to `/routines/[id]`
- No client-side JS on this page; save toggling happens on the detail page

### `/routines/[id]` — Detail page (Server Component + client island)

Renders in order:
1. Header row: title (`font-black`, large) + `<SaveButton>` top-right
2. Meta row: category pill + clock icon + "~N min"
3. Intro paragraph (`text-sm text-muted-foreground`)
4. Numbered steps — each step has a bold title + description body
5. Source attribution (small, linked to `sourceUrl`)
6. Medical disclaimer: *"This is not medical advice. Please consult your dermatologist for treatment decisions."*

Returns 404 (`notFound()`) for unknown routine IDs.

---

## Components

### `components/save-routine-button.tsx`

- `"use client"`
- Props: `routineId: string`, `initialSaved: boolean`
- Uses `useTransition` for pending state; optimistically toggles the bookmark icon
- Calls `saveRoutine` or `unsaveRoutine` Server Action on press
- Icon: Lucide `Bookmark` (outlined = unsaved, filled = saved)

---

## Server Actions — `lib/routines/actions.ts`

```ts
"use server"

saveRoutine(routineId: string): Promise<void>
unsaveRoutine(routineId: string): Promise<void>
```

Each action:
1. Verifies auth via Supabase server client (`getUser()`)
2. Inserts into or deletes from `saved_routines`
3. Calls `revalidatePath("/routines")` and `revalidatePath(`/routines/${routineId}`)`

---

## You Tab Update

- Remove `disabled` prop from the routines `PreviewCard`
- Update `secondary` text from "Coming soon" to `"X saved"` (0 if none)
- Fetch saved count alongside existing stats query on the You page

---

## Visual Treatment

Strictly follows `DESIGN.md`. Key rules that apply to this feature:

**Typography**
- Page title ("Routines", routine title): Wise Sans weight 900, line-height 0.85, `"calt"` enabled — same as all display headings in the app
- Body / step descriptions: Inter 18px weight 400, line-height 1.44, letter-spacing 0.18px
- Step titles: Inter 18px weight 600 (Body Semibold), letter-spacing -0.108px
- Category pill label, meta text, source attribution: Inter 14px weight 600, Caption style
- Medical disclaimer: Inter 12px weight 400–600, Small style

**Colors**
- Text: Near Black `#0e0f0c`
- Card border: `rgba(14,15,12,0.12)` ring shadow / `1px solid rgba(14,15,12,0.12)`
- Category pill background: Light Mint `#e2f6d5`, text Dark Green `#163300`
- Save button (saved state): Wise Green `#9fe870` fill, Dark Green `#163300` icon
- Save button (unsaved state): muted background `rgba(22,51,0,0.08)`, Near Black icon
- Muted / secondary text: Gray `#868685`

**Cards & Containers**
- Routine list cards: 30px border-radius (Large card), `1px solid rgba(14,15,12,0.12)` border, no drop shadow
- Detail page container: same 30px radius card wrapping the steps section

**Interactions**
- Save button hover: `scale(1.05)`, active: `scale(0.95)` — no color change, physical growth only
- Routine list cards: `hover:scale-[1.02] active:scale-[0.98]` (same as existing PreviewCard links)

**Medical disclaimer**
- Exact copy: *"This is not medical advice. Please consult your dermatologist for treatment decisions."*
- Style: `text-xs font-medium text-muted-foreground px-2` — same as every other page

---

## Schema Migration

Add to `supabase/schema.sql` and run in Supabase SQL editor.

---

## Files Created / Modified

| File | Action |
|------|--------|
| `content/routines.ts` | Create — static routine data |
| `lib/routines/actions.ts` | Create — save/unsave Server Actions |
| `components/save-routine-button.tsx` | Create — client bookmark toggle |
| `app/(app)/routines/page.tsx` | Create — list page |
| `app/(app)/routines/[id]/page.tsx` | Create — detail page |
| `app/(app)/you/page.tsx` | Modify — enable routines card, show saved count |
| `supabase/schema.sql` | Modify — add `saved_routines` table |

---

## Out of Scope (this session)

- Step completion / checklist interaction
- User-created routines
- Search or filter on the list page
- Notifications or reminders tied to routines
