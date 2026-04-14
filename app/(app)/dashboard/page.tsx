import { AnalyzePanel } from "@/components/analyze-panel";
import { BodyHeatmap } from "@/components/body-heatmap";
import { StreakCounter } from "@/components/streak-counter";
import { TrendChart } from "@/components/trend-chart";
import {
  averageItch,
  averageSleep,
  buildTrendSeries,
  calculateStreak,
  sleepItchCorrelation,
  topAffectedAreas,
  topFoods,
  type LogSummary,
} from "@/lib/logs/analytics";
import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 3;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const since = new Date();
  since.setDate(since.getDate() - 29);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: logRows } = await supabase
    .from("daily_logs")
    .select(
      "id, log_date, itch_level, stress_level, sleep_hours, sleep_quality, affected_areas, notes",
    )
    .eq("user_id", user.id)
    .gte("log_date", sinceIso)
    .order("log_date", { ascending: false });

  const logs: LogSummary[] = logRows ?? [];
  const logIds = logs.map((l) => l.id);

  const { data: foodRows } =
    logIds.length > 0
      ? await supabase
          .from("food_entries")
          .select("food_name, log_id")
          .in("log_id", logIds)
      : { data: [] };

  const streak = calculateStreak(logs);
  const trend = buildTrendSeries(logs, 14);
  const avgItch = averageItch(logs);
  const avgSleep = averageSleep(logs);
  const areas = topAffectedAreas(logs);
  const foods = topFoods(foodRows ?? []);
  const correlation = sleepItchCorrelation(logs);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count: usedToday } = await supabase
    .from("ai_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfDay.toISOString());

  const initialRemaining = Math.max(0, DAILY_LIMIT - (usedToday ?? 0));
  const hasEnoughData = logs.length >= 3;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Dashboard
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          Last 30 days at a glance.
        </p>
      </div>

      <StreakCounter streak={streak} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Avg itch"
          value={avgItch != null ? avgItch.toFixed(1) : "—"}
          suffix={avgItch != null ? "/10" : undefined}
        />
        <StatCard
          label="Avg sleep"
          value={avgSleep != null ? avgSleep.toFixed(1) : "—"}
          suffix={avgSleep != null ? "h" : undefined}
        />
      </div>

      <AnalyzePanel
        initialRemaining={initialRemaining}
        initialLimit={DAILY_LIMIT}
        hasEnoughData={hasEnoughData}
      />

      <Section title="Itch trend (14 days)">
        <TrendChart data={trend} />
      </Section>

      <Section title="Sleep vs itch">
        <SleepItchInsight data={correlation} />
      </Section>

      <Section title="Top affected areas">
        <BodyHeatmap areas={areas} />
      </Section>

      <Section title="Most logged foods">
        {foods.length === 0 ? (
          <p className="text-sm font-medium text-muted-foreground">
            No foods logged yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {foods.map((f) => (
              <li
                key={f.name}
                className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm font-semibold"
              >
                <span>{f.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {f.count}x
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="px-2 text-xs font-medium text-muted-foreground">
        This is not medical advice. Please consult your dermatologist for
        treatment decisions.
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-black leading-none tabular-nums">
          {value}
        </span>
        {suffix && (
          <span className="text-sm font-semibold text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SleepItchInsight({
  data,
}: {
  data: ReturnType<typeof sleepItchCorrelation>;
}) {
  if (!data.highSleep && !data.lowSleep) {
    return (
      <p className="text-sm font-medium text-muted-foreground">
        Need at least 3 days with both sleep and itch logged.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.highSleep && (
        <Row
          label="≥ 7h sleep"
          value={data.highSleep.avgItch.toFixed(1)}
          caption={`${data.highSleep.count} day${data.highSleep.count === 1 ? "" : "s"}`}
        />
      )}
      {data.lowSleep && (
        <Row
          label="< 7h sleep"
          value={data.lowSleep.avgItch.toFixed(1)}
          caption={`${data.lowSleep.count} day${data.lowSleep.count === 1 ? "" : "s"}`}
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="flex items-baseline justify-between rounded-xl bg-muted/60 px-3 py-2">
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-[11px] font-medium text-muted-foreground">
          {caption}
        </div>
      </div>
      <div className="text-2xl font-black tabular-nums">
        {value}
        <span className="ml-0.5 text-sm font-semibold text-muted-foreground">
          /10
        </span>
      </div>
    </div>
  );
}
