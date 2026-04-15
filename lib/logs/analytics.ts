import type { DailyLog, FoodEntry } from "@/lib/supabase/types";

export type LogSummary = Pick<
  DailyLog,
  | "id"
  | "log_date"
  | "itch_level"
  | "stress_level"
  | "sleep_hours"
  | "sleep_quality"
  | "affected_areas"
  | "notes"
  | "skin_status"
  | "quick_tags"
>;

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function calculateStreak(logs: LogSummary[]): number {
  if (logs.length === 0) return 0;
  const dates = new Set(logs.map((l) => l.log_date));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = toLocalDateString(cursor);
    if (!dates.has(key)) {
      if (streak === 0 && toLocalDateString(new Date()) === key) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface TrendPoint {
  date: string;
  label: string;
  itch: number | null;
  sleep: number | null;
}

export function buildTrendSeries(
  logs: LogSummary[],
  days: number,
): TrendPoint[] {
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const points: TrendPoint[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const key = toLocalDateString(cursor);
    const log = byDate.get(key);
    points.push({
      date: key,
      label: cursor.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      itch: log?.itch_level ?? null,
      sleep: log?.sleep_hours != null ? Number(log.sleep_hours) : null,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

export function averageItch(logs: LogSummary[]): number | null {
  const values = logs
    .map((l) => l.itch_level)
    .filter((n): n is number => n != null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function averageSleep(logs: LogSummary[]): number | null {
  const values = logs
    .map((l) => l.sleep_hours)
    .filter((n): n is number => n != null)
    .map(Number);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function topAffectedAreas(
  logs: LogSummary[],
  limit = 5,
): Array<{ area: string; count: number; percent: number }> {
  const totals = new Map<string, number>();
  let denom = 0;
  for (const log of logs) {
    if (!log.affected_areas || log.affected_areas.length === 0) continue;
    denom += 1;
    for (const area of log.affected_areas) {
      totals.set(area, (totals.get(area) ?? 0) + 1);
    }
  }
  if (denom === 0) return [];
  return Array.from(totals.entries())
    .map(([area, count]) => ({
      area,
      count,
      percent: count / denom,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function topFoods(
  foods: Pick<FoodEntry, "food_name">[],
  limit = 5,
): Array<{ name: string; count: number }> {
  const totals = new Map<string, number>();
  for (const row of foods) {
    const key = row.food_name.trim().toLowerCase();
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  return Array.from(totals.entries())
    .map(([name, count]) => ({
      name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function sleepItchCorrelation(logs: LogSummary[]): {
  highSleep: { avgItch: number; count: number } | null;
  lowSleep: { avgItch: number; count: number } | null;
} {
  const paired = logs.filter(
    (l) => l.itch_level != null && l.sleep_hours != null,
  );
  if (paired.length < 3) return { highSleep: null, lowSleep: null };

  const high = paired.filter((l) => Number(l.sleep_hours) >= 7);
  const low = paired.filter((l) => Number(l.sleep_hours) < 7);

  const avg = (xs: LogSummary[]) =>
    xs.reduce((acc, l) => acc + (l.itch_level ?? 0), 0) / xs.length;

  return {
    highSleep:
      high.length > 0 ? { avgItch: avg(high), count: high.length } : null,
    lowSleep: low.length > 0 ? { avgItch: avg(low), count: low.length } : null,
  };
}

export { parseLocalDate, toLocalDateString };
