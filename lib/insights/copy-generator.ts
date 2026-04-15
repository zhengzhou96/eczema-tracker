import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { dermatologistContext } from "./dermatologist-context";
import type { Finding, PredictionState } from "./engine";
import type { Json } from "@/lib/supabase/types";

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
    input_summary: { findings, prediction } as unknown as Json,
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
