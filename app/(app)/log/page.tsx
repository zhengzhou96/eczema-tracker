import { createClient } from "@/lib/supabase/server";
import { LogForm } from "./log-form";

function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function LogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const log_date = todayLocalDate();

  const { data: log } = user
    ? await supabase
        .from("daily_logs")
        .select("id, itch_level, stress_level, sleep_hours, sleep_quality, affected_areas, notes")
        .eq("user_id", user.id)
        .eq("log_date", log_date)
        .maybeSingle()
    : { data: null };

  const [{ data: foodRows }, { data: photoRows }] = log
    ? await Promise.all([
        supabase
          .from("food_entries")
          .select("food_name")
          .eq("log_id", log.id),
        supabase.from("photos").select("id").eq("log_id", log.id),
      ])
    : [{ data: null }, { data: null }];

  const initial = {
    itch_level: log?.itch_level ?? 0,
    stress_level: log?.stress_level ?? 0,
    sleep_hours:
      log?.sleep_hours != null ? String(log.sleep_hours) : "",
    sleep_quality: log?.sleep_quality ?? 5,
    affected_areas: log?.affected_areas ?? [],
    notes: log?.notes ?? "",
    foods: (foodRows ?? []).map((row) => ({ name: row.food_name })),
    savedPhotoCount: photoRows?.length ?? 0,
  };

  const heading = log ? "Today's log" : "Start today's log";
  const subheading = log
    ? "Update anything you missed earlier."
    : "Sixty seconds. That's all it takes.";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          {heading}
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          {subheading}
        </p>
      </div>
      <LogForm initial={initial} />
    </div>
  );
}
