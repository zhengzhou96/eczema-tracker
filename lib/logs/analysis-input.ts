import type { FoodEntry } from "@/lib/supabase/types";
import {
  averageItch,
  averageSleep,
  calculateStreak,
  sleepItchCorrelation,
  topAffectedAreas,
  topFoods,
  type LogSummary,
} from "@/lib/logs/analytics";

export type AnalysisPeriod = "7d" | "30d";

export interface AnalysisInput {
  period: AnalysisPeriod;
  days: number;
  logCount: number;
  averageItch: number | null;
  averageSleep: number | null;
  streak: number;
  topAreas: Array<{ area: string; count: number }>;
  topFoods: Array<{ name: string; count: number }>;
  sleepItch: {
    highSleepAvgItch: number | null;
    lowSleepAvgItch: number | null;
  };
  entries: Array<{
    date: string;
    itch: number | null;
    stress: number | null;
    sleepHours: number | null;
    sleepQuality: number | null;
    areas: string[];
    foods: string[];
    notes: string | null;
  }>;
}

export function daysForPeriod(period: AnalysisPeriod): number {
  return period === "7d" ? 7 : 30;
}

export function buildAnalysisInput(
  period: AnalysisPeriod,
  logs: LogSummary[],
  foods: Pick<FoodEntry, "log_id" | "food_name">[],
): AnalysisInput {
  const days = daysForPeriod(period);
  const foodsByLog = new Map<string, string[]>();
  for (const f of foods) {
    const list = foodsByLog.get(f.log_id) ?? [];
    list.push(f.food_name);
    foodsByLog.set(f.log_id, list);
  }

  const entries = [...logs]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((l) => ({
      date: l.log_date,
      itch: l.itch_level,
      stress: l.stress_level,
      sleepHours: l.sleep_hours != null ? Number(l.sleep_hours) : null,
      sleepQuality: l.sleep_quality,
      areas: l.affected_areas ?? [],
      foods: foodsByLog.get(l.id) ?? [],
      notes: l.notes,
    }));

  const correlation = sleepItchCorrelation(logs);

  return {
    period,
    days,
    logCount: logs.length,
    averageItch: averageItch(logs),
    averageSleep: averageSleep(logs),
    streak: calculateStreak(logs),
    topAreas: topAffectedAreas(logs, 5).map(({ area, count }) => ({
      area,
      count,
    })),
    topFoods: topFoods(foods, 8),
    sleepItch: {
      highSleepAvgItch: correlation.highSleep?.avgItch ?? null,
      lowSleepAvgItch: correlation.lowSleep?.avgItch ?? null,
    },
    entries,
  };
}

export function formatAnalysisForPrompt(input: AnalysisInput): string {
  const lines: string[] = [];
  lines.push(
    `Period: last ${input.days} days (${input.logCount} day${
      input.logCount === 1 ? "" : "s"
    } logged)`,
  );
  lines.push(
    `Averages: itch ${fmt(input.averageItch)}/10, sleep ${fmt(
      input.averageSleep,
    )} h`,
  );
  lines.push(`Current streak: ${input.streak} day${input.streak === 1 ? "" : "s"}`);
  if (input.topAreas.length > 0) {
    lines.push(
      `Top affected areas: ${input.topAreas
        .map((a) => `${a.area} (${a.count})`)
        .join(", ")}`,
    );
  }
  if (input.topFoods.length > 0) {
    lines.push(
      `Most logged foods: ${input.topFoods
        .map((f) => `${f.name} (${f.count})`)
        .join(", ")}`,
    );
  }
  if (
    input.sleepItch.highSleepAvgItch != null ||
    input.sleepItch.lowSleepAvgItch != null
  ) {
    lines.push(
      `Sleep vs itch: ≥7h → ${fmt(
        input.sleepItch.highSleepAvgItch,
      )} avg itch, <7h → ${fmt(input.sleepItch.lowSleepAvgItch)} avg itch`,
    );
  }
  lines.push("");
  lines.push("Daily entries:");
  for (const e of input.entries) {
    const parts: string[] = [
      `${e.date}: itch ${fmt(e.itch)}/10, stress ${fmt(
        e.stress,
      )}/10, sleep ${fmt(e.sleepHours)}h (q ${fmt(e.sleepQuality)}/10)`,
    ];
    if (e.areas.length > 0) parts.push(`areas: ${e.areas.join(", ")}`);
    if (e.foods.length > 0) parts.push(`foods: ${e.foods.join(", ")}`);
    if (e.notes) parts.push(`notes: ${e.notes}`);
    lines.push(`- ${parts.join(" | ")}`);
  }
  return lines.join("\n");
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
