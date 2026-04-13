"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SaveResult = { success: true } | { error: string };

function clampInt(
  v: FormDataEntryValue | null,
  min: number,
  max: number,
): number | null {
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clampFloat(
  v: FormDataEntryValue | null,
  min: number,
  max: number,
): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function parseJsonArray(v: FormDataEntryValue | null): string[] {
  if (typeof v !== "string") return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function saveDailyLog(formData: FormData): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You're not signed in." };
  }

  const log_date = todayLocalDate();
  const itch_level = clampInt(formData.get("itch_level"), 0, 10);
  const stress_level = clampInt(formData.get("stress_level"), 0, 10);
  const sleep_hours = clampFloat(formData.get("sleep_hours"), 0, 24);
  const sleep_quality = clampInt(formData.get("sleep_quality"), 0, 10);
  const affected_areas = parseJsonArray(formData.get("affected_areas"));
  const foods = parseJsonArray(formData.get("foods"));
  const notesRaw = formData.get("notes");
  const notes =
    typeof notesRaw === "string" && notesRaw.trim().length > 0
      ? notesRaw.trim()
      : null;

  const { data: log, error: logError } = await supabase
    .from("daily_logs")
    .upsert(
      {
        user_id: user.id,
        log_date,
        itch_level,
        stress_level,
        sleep_hours,
        sleep_quality,
        affected_areas,
        notes,
      },
      { onConflict: "user_id,log_date" },
    )
    .select("id")
    .single();

  if (logError || !log) {
    return { error: logError?.message ?? "Could not save your log." };
  }

  const { error: deleteFoodsError } = await supabase
    .from("food_entries")
    .delete()
    .eq("log_id", log.id);

  if (deleteFoodsError) {
    return { error: deleteFoodsError.message };
  }

  if (foods.length > 0) {
    const { error: insertFoodsError } = await supabase
      .from("food_entries")
      .insert(
        foods.map((name) => ({
          log_id: log.id,
          food_name: name,
        })),
      );
    if (insertFoodsError) {
      return { error: insertFoodsError.message };
    }
  }

  const photoFiles = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  for (const file of photoFiles) {
    const id = crypto.randomUUID();
    const storagePath = `${user.id}/${log_date}/${id}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, file, {
        contentType: "image/jpeg",
        upsert: false,
      });
    if (uploadError) {
      return { error: `Photo upload failed: ${uploadError.message}` };
    }
    const { error: photoRowError } = await supabase.from("photos").insert({
      log_id: log.id,
      storage_path: storagePath,
    });
    if (photoRowError) {
      return { error: photoRowError.message };
    }
  }

  revalidatePath("/log");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  return { success: true };
}
