import { createClient } from "@/lib/supabase/server";
import { QuickLogForm } from "@/components/quick-log-form";
import { LogForm } from "./log-form";
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
    return <LogForm />;
  }

  const { data: todayLog } = await supabase
    .from("daily_logs")
    .select("skin_status, quick_tags")
    .eq("user_id", user.id)
    .eq("log_date", today)
    .maybeSingle();

  const { data: recentFoodRows } = await supabase
    .from("food_entries")
    .select("food_name, daily_logs!inner(user_id)")
    .eq("daily_logs.user_id", user.id)
    .order("food_name", { ascending: true })
    .limit(20);

  const recentFoods = [
    ...new Set((recentFoodRows ?? []).map((f) => f.food_name)),
  ];

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
    stress_flare:
      "Stress may be affecting your skin based on your logs. Consult your dermatologist for guidance.",
    sleep_flare:
      "Poor sleep appears to be linked to flare-ups in your logs. Consult your dermatologist for guidance.",
    food_flare: topFinding?.supportingData
      ? `${topFinding.supportingData}. Consult your dermatologist for guidance.`
      : "Certain foods may be connected to your flares. Consult your dermatologist for guidance.",
    consecutive_flares:
      "You've had several flare days recently — tracking consistently will help identify the cause. Consult your dermatologist for guidance.",
    clear_streak:
      "Your skin has been clear lately — keep noting what's been different! Consult your dermatologist for guidance.",
  };

  const insightCopy = topFinding
    ? (insightCopyMap[topFinding.rule] ?? null)
    : null;

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
