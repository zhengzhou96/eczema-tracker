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
    return NextResponse.json({ error: "Missing photoId." }, { status: 400 });
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
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
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
