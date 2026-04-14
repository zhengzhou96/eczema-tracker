import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarGrid, type CalendarDay, type DayLog } from "@/components/calendar-grid";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ year?: string; month?: string }>;

function clampMonth(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 1 && value <= 12 ? value : fallback;
}

function clampYear(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 2000 && value <= 2100
    ? value
    : fallback;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const year = clampYear(parseInt(sp.year ?? "", 10), currentYear);
  const month = clampMonth(parseInt(sp.month ?? "", 10), currentMonth);

  const monthStr = String(month).padStart(2, "0");
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDay = `${year}-${monthStr}-01`;
  const lastDay = `${year}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

  const { data: logRows } = await supabase
    .from("daily_logs")
    .select(
      "log_date, itch_level, stress_level, sleep_hours, sleep_quality, affected_areas, notes",
    )
    .eq("user_id", user.id)
    .gte("log_date", firstDay)
    .lte("log_date", lastDay);

  const logsByDate = new Map<string, DayLog>();
  for (const l of logRows ?? []) {
    if (typeof l.log_date === "string") {
      logsByDate.set(l.log_date, {
        itch_level: l.itch_level,
        stress_level: l.stress_level,
        sleep_hours: l.sleep_hours,
        sleep_quality: l.sleep_quality,
        affected_areas: l.affected_areas,
        notes: l.notes,
      });
    }
  }

  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = firstDayOfMonth.getUTCDay();
  const todayIso = now.toISOString().slice(0, 10);

  const days: CalendarDay[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    days.push({
      date: `blank-${i}`,
      dayOfMonth: 0,
      inMonth: false,
      isFuture: false,
      isToday: false,
      log: null,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
    days.push({
      date: iso,
      dayOfMonth: d,
      inMonth: true,
      isFuture: iso > todayIso,
      isToday: iso === todayIso,
      log: logsByDate.get(iso) ?? null,
    });
  }

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const monthName = firstDayOfMonth.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  const loggedCount = logsByDate.size;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href="/you"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
          Back to You
        </Link>
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Calendar
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          {loggedCount} of {daysInMonth} days logged this month.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-3">
        <Link
          href={`/calendar?year=${prevYear}&month=${prevMonth}`}
          aria-label="Previous month"
          className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform hover:scale-105 hover:text-foreground active:scale-95"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <span className="text-base font-black">
          {monthName} {year}
        </span>
        <Link
          href={`/calendar?year=${nextYear}&month=${nextMonth}`}
          aria-label="Next month"
          className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform hover:scale-105 hover:text-foreground active:scale-95"
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>

      <section className="rounded-3xl border border-border bg-card p-4">
        <CalendarGrid days={days} />
      </section>

      <Legend />

      <p className="px-2 text-xs font-medium text-muted-foreground">
        This is not medical advice. Please consult your dermatologist for
        treatment decisions.
      </p>
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Calm 0–2", cls: "bg-emerald-500/25" },
    { label: "Mild 3–5", cls: "bg-amber-400/35" },
    { label: "Flared 6–8", cls: "bg-orange-500/45" },
    { label: "Severe 9–10", cls: "bg-red-500/55" },
    { label: "No log", cls: "border border-dashed border-border" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <div
          key={i.label}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold text-muted-foreground"
        >
          <div className={`size-3 rounded ${i.cls}`} />
          {i.label}
        </div>
      ))}
    </div>
  );
}
