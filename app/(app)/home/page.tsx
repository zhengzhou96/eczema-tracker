import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WeekStrip, buildWeekDays } from "@/components/week-strip";
import { getFindings, getPrediction } from "@/lib/insights/engine";
import { getOrGenerateInsightCopy } from "@/lib/insights/copy-generator";
import type { InsightLog, InsightFood } from "@/lib/insights/engine";

function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const CONFIDENCE_LABELS: Record<string, string> = {
  possible: "possible",
  likely: "likely",
  strong: "strong",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "there";
  const today = new Date().toISOString().slice(0, 10);

  const { data: logRows } = await supabase
    .from("daily_logs")
    .select("id, log_date, skin_status, quick_tags, stress_level, itch_level")
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

  const todayLog = insightLogs.find((l) => l.log_date === today);
  const totalLogs = insightLogs.length;

  const findings = getFindings(insightLogs, insightFoods);
  const prediction = getPrediction(insightLogs);

  let insightCopy = null;
  if (findings.length > 0) {
    insightCopy = await getOrGenerateInsightCopy(user.id, findings, prediction);
  }

  const logsByDate = new Map<string, "clear" | "mild" | "flare">();
  for (const l of insightLogs) {
    if (l.skin_status) logsByDate.set(l.log_date, l.skin_status);
  }
  const weekDays = buildWeekDays(today, logsByDate);

  const weekStatuses = weekDays.map((d) => d.skinStatus).filter(Boolean) as string[];
  const flareCount = weekStatuses.filter((s) => s === "flare").length;
  const mildCount = weekStatuses.filter((s) => s === "mild").length;
  const clearCount = weekStatuses.filter((s) => s === "clear").length;
  const bestDay = weekDays.find((d) => d.skinStatus === "clear");
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const bestDayLabel = bestDay ? (DAY_NAMES[weekDays.indexOf(bestDay)] ?? null) : null;

  const SKIN_STATUS_LABELS: Record<string, string> = {
    clear: "Clear",
    mild: "Mild",
    flare: "Flare",
  };

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
        {greeting(new Date().getHours())}, {firstName}
      </h1>

      {todayLog ? (
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Today ·{" "}
              {todayLog.skin_status
                ? SKIN_STATUS_LABELS[todayLog.skin_status]
                : "Logged"}
            </span>
            <Link
              href="/log"
              className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Edit →
            </Link>
          </div>
          {todayLog.quick_tags && todayLog.quick_tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {todayLog.quick_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
                >
                  {tag.replace("_", " ")}
                </span>
              ))}
            </div>
          )}
        </section>
      ) : (
        <Link
          href="/log"
          className="flex items-center justify-between rounded-3xl bg-primary p-5 text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-base font-bold">Log today</span>
          <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-sm font-bold text-primary-foreground">
            Quick check-in →
          </span>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Your Skin Patterns
        </h2>
        {totalLogs < 3 ? (
          <p className="rounded-3xl border border-dashed border-border p-5 text-sm font-medium text-muted-foreground">
            {totalLogs === 0
              ? "Log once to start discovering patterns"
              : `Log ${3 - totalLogs} more day${3 - totalLogs === 1 ? "" : "s"} to unlock your first pattern`}
          </p>
        ) : findings.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-5 text-sm font-medium text-muted-foreground">
            Keep logging — patterns will appear soon.
          </p>
        ) : (
          <div className="space-y-3">
            {findings.slice(0, 3).map((finding) => {
              const copy = insightCopy?.insights.find(
                (i) => i.rule === finding.rule,
              )?.copy;
              return (
                <div
                  key={finding.rule}
                  className="rounded-3xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-relaxed">
                      {copy ?? "Pattern detected in your logs."}
                    </p>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {CONFIDENCE_LABELS[finding.confidence]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {totalLogs >= 2 && prediction !== "neutral" && (
        <section
          className="rounded-3xl p-5 text-white"
          style={{ background: "#163300" }}
        >
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-60">
            Tomorrow&apos;s Forecast
          </h2>
          <p className="mt-2 text-lg font-black">
            {prediction === "elevated"
              ? "⚠️ Elevated risk"
              : "✅ Skin likely stable"}
          </p>
          {insightCopy?.prediction && (
            <p className="mt-1 text-sm opacity-70">{insightCopy.prediction}</p>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          This Week
        </h2>
        <WeekStrip days={weekDays} showLabels />
        {weekStatuses.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
            {flareCount > 0 && <span>{flareCount} flare</span>}
            {mildCount > 0 && <span>{mildCount} mild</span>}
            {clearCount > 0 && <span>{clearCount} clear</span>}
            {bestDayLabel && (
              <span className="text-primary">Best day: {bestDayLabel}</span>
            )}
          </div>
        )}
      </section>

      <p className="px-2 text-xs font-medium text-muted-foreground">
        Not medical advice. Consult your dermatologist.
      </p>
    </div>
  );
}
