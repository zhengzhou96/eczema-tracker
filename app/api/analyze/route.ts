import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  buildAnalysisInput,
  daysForPeriod,
  formatAnalysisForPrompt,
  type AnalysisPeriod,
} from "@/lib/logs/analysis-input";
import type { LogSummary } from "@/lib/logs/analytics";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAILY_LIMIT = 3;
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a supportive eczema tracking assistant. You analyze the user's logged data to identify patterns. You are NOT a doctor. Never diagnose conditions or prescribe treatments. Instead:
- Identify correlations between food, sleep, stress, and itch severity
- Note trends (improving, worsening, stable)
- Highlight potential triggers based on timing patterns
- Suggest areas to discuss with their dermatologist
- Be encouraging and empathetic — eczema is frustrating
Always end your response with: "This is not medical advice. Please consult your dermatologist for treatment decisions."

Formatting:
- Use short paragraphs and dash bullets ("- ")
- Use **bold** for key findings
- Keep it under ~350 words
- Never use the words "diagnose", "diagnosis", "prescribe", "prescription", "treat", or "treatment" (except in the closing disclaimer).`;

function isPeriod(value: unknown): value is AnalysisPeriod {
  return value === "7d" || value === "30d";
}

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

  const period = (payload as { period?: unknown })?.period;
  if (!isPeriod(period)) {
    return NextResponse.json(
      { error: "Invalid period. Use '7d' or '30d'." },
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
        error: `You've used all ${DAILY_LIMIT} analyses for today. Come back tomorrow!`,
        remaining: 0,
      },
      { status: 429 },
    );
  }

  const days = daysForPeriod(period);
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: logRows, error: logsError } = await supabase
    .from("daily_logs")
    .select(
      "id, log_date, itch_level, stress_level, sleep_hours, sleep_quality, affected_areas, notes, skin_status, quick_tags",
    )
    .eq("user_id", user.id)
    .gte("log_date", sinceIso)
    .order("log_date", { ascending: false });

  if (logsError) {
    return NextResponse.json(
      { error: "Could not load your logs. Try again." },
      { status: 500 },
    );
  }

  const logs: LogSummary[] = logRows ?? [];

  if (logs.length < 3) {
    return NextResponse.json(
      {
        error:
          "Log at least 3 days before analyzing so there's a pattern to find.",
      },
      { status: 400 },
    );
  }

  const logIds = logs.map((l) => l.id);
  const { data: foodRows, error: foodsError } =
    logIds.length > 0
      ? await supabase
          .from("food_entries")
          .select("log_id, food_name")
          .in("log_id", logIds)
      : { data: [], error: null };

  if (foodsError) {
    return NextResponse.json(
      { error: "Could not load your food entries. Try again." },
      { status: 500 },
    );
  }

  const input = buildAnalysisInput(period, logs, foodRows ?? []);
  const userPrompt = `Please analyze my eczema tracking data for patterns and insights.\n\n${formatAnalysisForPrompt(
    input,
  )}`;

  let resultText: string;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
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
    console.error("[analyze] Claude call failed", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again in a moment." },
      { status: 502 },
    );
  }

  const { data: saved, error: saveError } = await supabase
    .from("ai_analyses")
    .insert({
      user_id: user.id,
      analysis_type: `weekly_${period}`,
      input_summary: {
        period: input.period,
        days: input.days,
        logCount: input.logCount,
        averageItch: input.averageItch,
        averageSleep: input.averageSleep,
        streak: input.streak,
        topAreas: input.topAreas,
        topFoods: input.topFoods,
        sleepItch: input.sleepItch,
      },
      result: resultText,
      model: MODEL,
    })
    .select("id, created_at")
    .single();

  if (saveError) {
    console.error("[analyze] Save failed", saveError);
  }

  const remaining = Math.max(0, DAILY_LIMIT - ((usedToday ?? 0) + 1));

  return NextResponse.json({
    id: saved?.id ?? null,
    createdAt: saved?.created_at ?? new Date().toISOString(),
    result: resultText,
    period,
    remaining,
    limit: DAILY_LIMIT,
  });
}
