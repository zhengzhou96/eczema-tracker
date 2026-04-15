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

  const updatePayload = {
    quick_tags: tags,
    ...(stressLevel !== null && { stress_level: stressLevel }),
  };

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
