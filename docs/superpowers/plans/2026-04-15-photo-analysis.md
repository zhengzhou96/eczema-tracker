# Session 11: Photo AI Analysis

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to submit a photo from their logs to Claude vision for an observational skin description. 1 photo analysis per day. Results saved to `ai_analyses` and shown in the analyses history page.

**Medical safety rule:** Purely observational language only. No diagnosis, no treatment language. Disclaimer on every result.

**Architecture:**
- `/api/analyze-photo` — POST route, downloads photo from Supabase Storage, calls Claude vision, saves to `ai_analyses` with `analysis_type = 'photo_analysis'`
- `AnalyzePhotoButton` — `"use client"` component: button → loading → inline result card
- `/analyze-photo` — Server Component page: lists user's recent photos with signed URL thumbnails + an `AnalyzePhotoButton` per photo
- Entry point: "Analyze a photo →" link added to the top of `/analyses` page
- Analyses page: `formatAnalysisType` updated for `photo_analysis`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/analyze-photo/route.ts` | Create | Vision endpoint: auth, rate limit, storage download, Claude call, save |
| `components/analyze-photo-button.tsx` | Create | Client button: calls API, shows result inline |
| `app/(app)/analyze-photo/page.tsx` | Create | Server Component: photo grid with signed URLs + AnalyzePhotoButton |
| `app/(app)/analyses/page.tsx` | Modify | Add `/analyze-photo` link + update formatAnalysisType |

---

## Task 1: API route — `/api/analyze-photo/route.ts`

**Files:**
- Create: `app/api/analyze-photo/route.ts`

- [ ] **Step 1: Create the route**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAILY_LIMIT = 1;
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a supportive eczema tracking assistant reviewing a photo the user has taken of their skin. Your role is purely observational — describe only what is visually apparent.

Rules:
- Describe the visible appearance: areas of redness, texture, dryness, scaling, distribution across the skin, any visible irritation patterns
- Use plain, non-clinical language the user can understand
- Do NOT diagnose conditions or identify specific diseases
- Do NOT recommend specific medications or treatments
- Do NOT use the words "diagnose", "diagnosis", "prescribe", "prescription"
- Be empathetic — acknowledge that dealing with skin conditions is difficult
- Keep the observation to 3–5 sentences
- Always end with: "This is not medical advice. Please consult your dermatologist for treatment decisions."`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const photoId = (payload as { photoId?: unknown })?.photoId;
  if (typeof photoId !== "string" || !photoId) {
    return NextResponse.json(
      { error: "Missing photoId." },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Analysis is not configured. Try again later." },
      { status: 503 },
    );
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count: usedToday, error: countError } = await supabase
    .from("ai_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("analysis_type", "photo_analysis")
    .gte("created_at", startOfDay.toISOString());

  if (countError) {
    return NextResponse.json(
      { error: "Could not check your daily limit. Try again." },
      { status: 500 },
    );
  }

  if ((usedToday ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `You've used your photo observation for today. Come back tomorrow!`,
        remaining: 0,
      },
      { status: 429 },
    );
  }

  // Fetch photo record — RLS ensures ownership via daily_logs.user_id
  const { data: photo, error: photoError } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (photoError || !photo) {
    return NextResponse.json(
      { error: "Photo not found." },
      { status: 404 },
    );
  }

  // Download photo from Supabase Storage
  const { data: blob, error: downloadError } = await supabase.storage
    .from("photos")
    .download(photo.storage_path);

  if (downloadError || !blob) {
    console.error("[analyze-photo] Storage download failed", downloadError);
    return NextResponse.json(
      { error: "Could not load the photo. Try again." },
      { status: 500 },
    );
  }

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  let resultText: string;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Please describe what you observe about the skin condition visible in this photo.",
            },
          ],
        },
      ],
    });

    resultText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!resultText) {
      throw new Error("Empty response from Claude.");
    }
  } catch (err) {
    console.error("[analyze-photo] Claude call failed", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again in a moment." },
      { status: 502 },
    );
  }

  const { data: saved, error: saveError } = await supabase
    .from("ai_analyses")
    .insert({
      user_id: user.id,
      analysis_type: "photo_analysis",
      input_summary: { photoId: photo.id, storagePath: photo.storage_path },
      result: resultText,
      model: MODEL,
    })
    .select("id, created_at")
    .single();

  if (saveError) {
    console.error("[analyze-photo] Save failed", saveError);
  }

  const remaining = Math.max(0, DAILY_LIMIT - ((usedToday ?? 0) + 1));

  return NextResponse.json({
    id: saved?.id ?? null,
    createdAt: saved?.created_at ?? new Date().toISOString(),
    result: resultText,
    remaining,
    limit: DAILY_LIMIT,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/analyze-photo/route.ts
git commit -m "feat: add /api/analyze-photo Claude vision route with 1/day limit"
```

---

## Task 2: AnalyzePhotoButton client component

**Files:**
- Create: `components/analyze-photo-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Loader2, Microscope } from "lucide-react";
import { useState } from "react";

interface AnalyzeResult {
  id: string | null;
  result: string;
  remaining: number;
}

export function AnalyzePhotoButton({ photoId }: { photoId: string }) {
  const [state, setState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleAnalyze() {
    setState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      const json = (await res.json()) as
        | AnalyzeResult
        | { error: string; remaining?: number };

      if (!res.ok) {
        setErrorMsg((json as { error: string }).error ?? "Something went wrong.");
        setState("error");
        return;
      }

      setResult(json as AnalyzeResult);
      setState("done");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  if (state === "done" && result) {
    return (
      <div className="space-y-2">
        <div className="rounded-2xl bg-primary/10 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
            Skin observation
          </p>
          <p className="text-sm font-medium leading-relaxed text-foreground">
            {result.result}
          </p>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground">
          {result.remaining === 0
            ? "No photo observations remaining today."
            : `${result.remaining} observation${result.remaining === 1 ? "" : "s"} remaining today.`}
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">{errorMsg}</p>
        <button
          onClick={() => setState("idle")}
          className="text-xs font-semibold text-muted-foreground underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleAnalyze}
      disabled={state === "loading"}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
      style={{ backgroundColor: "#9fe870", color: "#163300" }}
    >
      {state === "loading" ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Observing…
        </>
      ) : (
        <>
          <Microscope className="size-4" aria-hidden />
          Get skin observation
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/analyze-photo-button.tsx
git commit -m "feat: add AnalyzePhotoButton client component"
```

---

## Task 3: Photo analysis page — `/analyze-photo`

**Files:**
- Create: `app/(app)/analyze-photo/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { ChevronLeft, ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyzePhotoButton } from "@/components/analyze-photo-button";
import { createClient } from "@/lib/supabase/server";

const AREA_LABELS: Record<string, string> = {
  face: "Face",
  neck: "Neck",
  chest: "Chest",
  back: "Back",
  arms: "Arms",
  hands: "Hands",
  abdomen: "Abdomen",
  legs: "Legs",
  feet: "Feet",
};

function formatLogDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default async function AnalyzePhotoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch recent photos via RLS (photos → daily_logs → user_id)
  const since = new Date();
  since.setDate(since.getDate() - 29);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("photos")
    .select("id, storage_path, body_area, created_at, daily_logs!inner(log_date, user_id)")
    .gte("daily_logs.log_date", sinceIso)
    .order("created_at", { ascending: false })
    .limit(20);

  type PhotoRow = {
    id: string;
    storage_path: string;
    body_area: string | null;
    created_at: string;
    daily_logs: { log_date: string; user_id: string } | { log_date: string; user_id: string }[];
  };

  const photos = (rows ?? []) as PhotoRow[];

  // Create signed URLs (60 min TTL) for thumbnails
  const photosWithUrls = await Promise.all(
    photos.map(async (p) => {
      const logDate = Array.isArray(p.daily_logs)
        ? p.daily_logs[0]?.log_date ?? ""
        : p.daily_logs.log_date;
      const { data: signed } = await supabase.storage
        .from("photos")
        .createSignedUrl(p.storage_path, 3600);
      return {
        id: p.id,
        signedUrl: signed?.signedUrl ?? null,
        bodyArea: p.body_area,
        logDate,
      };
    }),
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href="/analyses"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
          Back to analyses
        </Link>
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Photo observation
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Select a photo. Claude will describe what it sees — purely
          observational, no diagnosis. 1 observation per day.
        </p>
      </div>

      {photosWithUrls.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center space-y-2">
          <ImageOff className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-semibold text-foreground">No photos yet.</p>
          <p className="text-sm font-medium text-muted-foreground">
            Add photos when logging a day — tap the camera icon on the log
            page.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {photosWithUrls.map((p) => (
            <li
              key={p.id}
              className="rounded-3xl border border-border bg-card p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                {p.signedUrl ? (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={p.signedUrl}
                      alt={p.bodyArea ? `Photo of ${AREA_LABELS[p.bodyArea] ?? p.bodyArea}` : "Skin photo"}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ) : (
                  <div className="size-20 shrink-0 rounded-2xl bg-muted flex items-center justify-center">
                    <ImageOff className="size-6 text-muted-foreground" aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-tight">
                    {p.bodyArea ? (AREA_LABELS[p.bodyArea] ?? p.bodyArea) : "Skin photo"}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    {formatLogDate(p.logDate)}
                  </p>
                </div>
              </div>
              <AnalyzePhotoButton photoId={p.id} />
            </li>
          ))}
        </ul>
      )}

      <p className="px-2 text-xs font-medium text-muted-foreground">
        This is not medical advice. Please consult your dermatologist for
        treatment decisions.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: no TypeScript or build errors. `/analyze-photo` appears in the build output.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/analyze-photo/page.tsx"
git commit -m "feat: add /analyze-photo page with photo grid and signed URLs"
```

---

## Task 4: Update analyses page — add entry point + label

**Files:**
- Modify: `app/(app)/analyses/page.tsx`

- [ ] **Step 1: Add "Analyze a photo" link**

In `app/(app)/analyses/page.tsx`, after the `<p>` subtitle ("Every AI reflection you've run, newest first."), add a link:

```tsx
        <Link
          href="/analyze-photo"
          className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold transition-transform hover:scale-[1.03] active:scale-95"
          style={{ backgroundColor: "#9fe870", color: "#163300" }}
        >
          Analyze a photo →
        </Link>
```

- [ ] **Step 2: Update formatAnalysisType**

In `app/(app)/analyses/page.tsx`, update the `formatAnalysisType` function:

```ts
function formatAnalysisType(type: string): string {
  if (type === "weekly_7d") return "7-day reflection";
  if (type === "weekly_30d") return "30-day reflection";
  if (type === "photo_analysis") return "Photo observation";
  return type;
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/analyses/page.tsx"
git commit -m "feat: add photo analysis entry point and label to analyses page"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full build + lint**

```bash
pnpm build && pnpm lint
```

Expected: zero errors, zero warnings.

- [ ] **Step 2: Manual browser check**

Start dev server: `pnpm dev`

1. `/analyses` page shows "Analyze a photo →" button (Wise Green)
2. Clicking navigates to `/analyze-photo`
3. If no photos: empty state shows with message about log page camera icon
4. If photos exist: thumbnails render (or broken-image placeholder), date label shows
5. "Get skin observation" button triggers loading state
6. Result appears inline below the photo card
7. Disclaimer text visible at bottom
8. 375px mobile — no horizontal scroll

- [ ] **Step 3: Session tag**

```bash
git tag session-11
git push origin main --tags
```
