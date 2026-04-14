import { BookHeart, CalendarDays, ChevronRight, Settings as SettingsIcon, Trophy } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildStats, evaluateAchievements } from "@/lib/achievements/compute";
import { achievements } from "@/lib/achievements/definitions";
import type { LogSummary } from "@/lib/logs/analytics";
import { createClient } from "@/lib/supabase/server";

export default async function YouPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  const now = new Date();
  const monthPrefix = now.toISOString().slice(0, 7);
  const [yearStr, monthStr] = monthPrefix.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString(
    "en-US",
    { month: "long", timeZone: "UTC" },
  );
  const loggedThisMonth = new Set(
    logs
      .map((l) => l.log_date)
      .filter(
        (d): d is string => typeof d === "string" && d.startsWith(monthPrefix),
      ),
  ).size;

  const displayName = profile?.display_name?.trim() || "Your profile";
  const initial = (
    profile?.display_name?.trim().charAt(0) ??
    user.email?.trim().charAt(0) ??
    "•"
  ).toUpperCase();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          You
        </h1>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform hover:scale-[1.05] active:scale-95"
        >
          <SettingsIcon className="size-5" aria-hidden />
        </Link>
      </div>

      <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-black text-primary-foreground">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{displayName}</p>
          <p className="truncate text-xs font-medium text-muted-foreground">
            {user.email}
          </p>
        </div>
      </section>

      <div className="space-y-3">
        <PreviewCard
          href="/milestones"
          Icon={Trophy}
          label="Milestones"
          primary={`${earned.length} of ${achievements.length} earned`}
          secondary="See achievements"
        />

        <PreviewCard
          href="/calendar"
          Icon={CalendarDays}
          label={monthName}
          primary={`${loggedThisMonth} of ${daysInMonth} days logged`}
          secondary="Calendar coming soon"
          disabled
        />

        <PreviewCard
          href="/routines"
          Icon={BookHeart}
          label="Community routines"
          primary="Curated by the team"
          secondary="Coming soon"
          disabled
        />
      </div>

      <p className="px-2 text-xs font-medium text-muted-foreground">
        This is not medical advice. Please consult your dermatologist for
        treatment decisions.
      </p>
    </div>
  );
}

function PreviewCard({
  href,
  Icon,
  label,
  primary,
  secondary,
  disabled,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  primary: string;
  secondary: string;
  disabled?: boolean;
}) {
  const content = (
    <div className="flex items-center gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-base font-black leading-tight">{primary}</p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
          {secondary}
        </p>
      </div>
      {!disabled && (
        <ChevronRight
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
    </div>
  );

  if (disabled) {
    return (
      <div
        aria-disabled
        className="rounded-3xl border border-border bg-card p-5 opacity-60"
      >
        {content}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="block rounded-3xl border border-border bg-card p-5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      {content}
    </Link>
  );
}
