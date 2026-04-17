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
