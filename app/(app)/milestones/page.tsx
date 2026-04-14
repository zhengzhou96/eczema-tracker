import { ChevronLeft, Lock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  buildStats,
  evaluateAchievements,
  type EvaluatedAchievement,
} from "@/lib/achievements/compute";
import { achievements } from "@/lib/achievements/definitions";
import type { LogSummary } from "@/lib/logs/analytics";
import { createClient } from "@/lib/supabase/server";

export default async function MilestonesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: logRows } = await supabase
    .from("daily_logs")
    .select(
      "id, log_date, itch_level, stress_level, sleep_hours, sleep_quality, affected_areas, notes",
    )
    .eq("user_id", user.id)
    .order("log_date", { ascending: false });

  const logs: LogSummary[] = logRows ?? [];

  const { data: foodRows } = await supabase
    .from("food_entries")
    .select("food_name");

  const foodNames = (foodRows ?? []).map((f) => f.food_name);

  const { count: analysesCount } = await supabase
    .from("ai_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const stats = buildStats(logs, foodNames, analysesCount ?? 0);
  const result = evaluateAchievements(stats);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
          Back to home
        </Link>
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Milestones
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          {result.earned.length} of {achievements.length} earned
        </p>
      </div>

      {result.earned.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Earned
          </h2>
          <ul className="space-y-3">
            {result.earned.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </ul>
        </section>
      )}

      {result.locked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Still to earn
          </h2>
          <ul className="space-y-3">
            {result.locked.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </ul>
        </section>
      )}

      <p className="px-2 text-xs font-medium text-muted-foreground">
        This is not medical advice. Please consult your dermatologist for
        treatment decisions.
      </p>
    </div>
  );
}

function AchievementCard({
  achievement,
}: {
  achievement: EvaluatedAchievement;
}) {
  const { icon: Icon, title, description, evaluation } = achievement;
  const { earned, progress, caption } = evaluation;
  const percent = Math.round(progress * 100);

  return (
    <li
      className={
        "rounded-3xl border border-border bg-card p-5 " +
        (earned ? "" : "opacity-90")
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={
            "flex size-12 shrink-0 items-center justify-center rounded-2xl " +
            (earned
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground")
          }
        >
          {earned ? (
            <Icon className="size-6" aria-hidden />
          ) : (
            <Lock className="size-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base font-bold leading-tight">{title}</h3>
            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground tabular-nums">
              {percent}%
            </span>
          </div>
          <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
            {description}
          </p>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title} progress`}
          >
            <div
              className={
                "h-full rounded-full transition-all " +
                (earned ? "bg-primary" : "bg-foreground/40")
              }
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
            {caption}
          </p>
        </div>
      </div>
    </li>
  );
}
