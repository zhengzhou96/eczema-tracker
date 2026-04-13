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

function formatDate(iso: string): { day: string; full: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  let day: string;
  if (diff === 0) day = "Today";
  else if (diff === 1) day = "Yesterday";
  else
    day = date.toLocaleDateString(undefined, {
      weekday: "long",
    });

  const full = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return { day, full };
}

function itchTone(level: number | null): string {
  if (level == null) return "bg-muted text-muted-foreground";
  if (level >= 7) return "bg-destructive/15 text-destructive";
  if (level >= 4) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-primary/15 text-primary";
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: logs } = await supabase
    .from("daily_logs")
    .select(
      "id, log_date, itch_level, stress_level, sleep_hours, affected_areas, notes",
    )
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .limit(90);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          History
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          {logs && logs.length > 0
            ? `${logs.length} day${logs.length === 1 ? "" : "s"} tracked`
            : "Every day you've tracked."}
        </p>
      </div>

      {!logs || logs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
          Start tracking today — your first log is the hardest, and the most
          valuable.
        </div>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => {
            const { day, full } = formatDate(log.log_date);
            const areas = log.affected_areas ?? [];
            return (
              <li
                key={log.id}
                className="rounded-3xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {day}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {full}
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${itchTone(log.itch_level)}`}
                  >
                    Itch {log.itch_level ?? "—"}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                  {log.sleep_hours != null && (
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      {Number(log.sleep_hours)}h sleep
                    </span>
                  )}
                  {log.stress_level != null && (
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      Stress {log.stress_level}
                    </span>
                  )}
                  {areas.slice(0, 3).map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-primary/10 px-2.5 py-1 text-primary"
                    >
                      {AREA_LABELS[area] ?? area}
                    </span>
                  ))}
                  {areas.length > 3 && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                      +{areas.length - 3}
                    </span>
                  )}
                </div>

                {log.notes && (
                  <p className="mt-3 line-clamp-2 text-sm font-medium text-foreground/80">
                    {log.notes}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
