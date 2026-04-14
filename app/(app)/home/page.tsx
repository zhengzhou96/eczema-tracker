import { BarChart3, ChevronRight, ExternalLink, PencilLine, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { StreakCounter } from "@/components/streak-counter";
import { buildStats, evaluateAchievements } from "@/lib/achievements/compute";
import { achievements } from "@/lib/achievements/definitions";
import { getTodaysTip } from "@/lib/content/tips";
import { calculateStreak, type LogSummary } from "@/lib/logs/analytics";
import { createClient } from "@/lib/supabase/server";

function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: logRows } = await supabase
    .from("daily_logs")
    .select(
      "id, log_date, itch_level, stress_level, sleep_hours, sleep_quality, affected_areas, notes",
    )
    .eq("user_id", user.id)
    .order("log_date", { ascending: false });

  const logs: LogSummary[] = logRows ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = logs.find((l) => l.log_date === today);
  const streak = calculateStreak(logs);
  const tip = getTodaysTip();
  const firstName =
    profile?.display_name?.trim().split(/\s+/)[0] ?? "there";

  const { data: foodRows } = await supabase
    .from("food_entries")
    .select("food_name");

  const foodNames = (foodRows ?? []).map((f) => f.food_name);

  const { count: analysesCount } = await supabase
    .from("ai_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const stats = buildStats(logs, foodNames, analysesCount ?? 0);
  const { earned } = evaluateAchievements(stats);
  const earnedCount = earned.length;
  const milestonesTotal = achievements.length;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          {greeting(new Date().getHours())}, {firstName}
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          {todayLog
            ? "You're logged for today. Nice work."
            : "Take 60 seconds to log your day."}
        </p>
      </div>

      {todayLog ? (
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Today&apos;s log
            </span>
            <Link
              href="/log"
              className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Edit →
            </Link>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-4xl font-black tabular-nums">
              {todayLog.itch_level ?? "—"}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              / 10 itch
            </span>
          </div>
        </section>
      ) : (
        <Link
          href="/log"
          className="flex items-center justify-between rounded-3xl bg-primary p-5 text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <PencilLine className="size-5" aria-hidden />
            <span className="text-base font-bold">Log today</span>
          </div>
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      )}

      <StreakCounter streak={streak} />

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Today&apos;s tip
          </span>
        </div>
        <h2 className="mt-3 text-lg font-black leading-tight">{tip.title}</h2>
        <p className="mt-2 text-sm leading-6 text-foreground">{tip.body}</p>
        <a
          href={tip.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Source: {tip.source}
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <QuickLink
          href="/dashboard"
          label="Dashboard"
          caption="Trends & insights"
          Icon={BarChart3}
        />
        <QuickLink
          href="/milestones"
          label="Milestones"
          caption={`${earnedCount} of ${milestonesTotal} earned`}
          Icon={Trophy}
        />
      </div>

      <p className="px-2 text-xs font-medium text-muted-foreground">
        This is not medical advice. Please consult your dermatologist for
        treatment decisions.
      </p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  caption,
  Icon,
  disabled,
}: {
  href: string;
  label: string;
  caption: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  disabled?: boolean;
}) {
  const content = (
    <>
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <div className="mt-2 text-sm font-bold">{label}</div>
      <div className="text-[11px] font-medium text-muted-foreground">
        {caption}
      </div>
    </>
  );
  if (disabled) {
    return (
      <div
        aria-disabled
        className="rounded-3xl border border-border bg-card p-4 opacity-60"
      >
        {content}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-3xl border border-border bg-card p-4 transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      {content}
    </Link>
  );
}
