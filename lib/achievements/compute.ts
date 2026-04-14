import {
  achievements,
  type AchievementDef,
  type AchievementEvaluation,
  type MilestoneStats,
} from "@/lib/achievements/definitions";
import { calculateStreak, type LogSummary } from "@/lib/logs/analytics";

export interface EvaluatedAchievement extends AchievementDef {
  evaluation: AchievementEvaluation;
}

export interface MilestoneResult {
  stats: MilestoneStats;
  earned: EvaluatedAchievement[];
  locked: EvaluatedAchievement[];
}

function computeMaxCalmStreak(logs: LogSummary[]): number {
  const ascending = [...logs].sort((a, b) =>
    a.log_date.localeCompare(b.log_date),
  );
  let best = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const log of ascending) {
    if (log.itch_level == null || log.itch_level > 5) {
      run = 0;
      prevDate = log.log_date;
      continue;
    }
    if (prevDate === null) {
      run = 1;
    } else {
      const prev = new Date(prevDate + "T00:00:00Z").getTime();
      const curr = new Date(log.log_date + "T00:00:00Z").getTime();
      const diffDays = Math.round((curr - prev) / 86_400_000);
      run = diffDays === 1 ? run + 1 : 1;
    }
    if (run > best) best = run;
    prevDate = log.log_date;
  }
  return best;
}

function daysAgoIso(days: number, today: Date): string {
  const d = new Date(today);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function averageItchInWindow(
  logs: LogSummary[],
  fromIso: string,
  toIso: string,
): { avg: number | null; count: number } {
  const inWindow = logs.filter(
    (l) =>
      l.log_date >= fromIso &&
      l.log_date <= toIso &&
      l.itch_level != null,
  );
  if (inWindow.length === 0) return { avg: null, count: 0 };
  const sum = inWindow.reduce((acc, l) => acc + (l.itch_level as number), 0);
  return { avg: sum / inWindow.length, count: inWindow.length };
}

export function buildStats(
  logs: LogSummary[],
  foodNames: string[],
  analysesCount: number,
  today: Date = new Date(),
): MilestoneStats {
  const logCount = logs.length;
  const currentStreak = calculateStreak(logs);
  const maxCalmStreak = computeMaxCalmStreak(logs);

  const last30To = today.toISOString().slice(0, 10);
  const last30From = daysAgoIso(29, today);
  const prev30To = daysAgoIso(30, today);
  const prev30From = daysAgoIso(59, today);

  const last = averageItchInWindow(logs, last30From, last30To);
  const prev = averageItchInWindow(logs, prev30From, prev30To);

  let improvementRatio: number | null = null;
  if (
    last.avg != null &&
    prev.avg != null &&
    last.count >= 5 &&
    prev.count >= 5 &&
    prev.avg > 0
  ) {
    const raw = (prev.avg - last.avg) / prev.avg;
    improvementRatio = raw < 0 ? 0 : raw;
  }

  const distinctFoods = new Set<string>();
  for (const name of foodNames) {
    const key = name.trim().toLowerCase();
    if (key) distinctFoods.add(key);
  }

  const distinctAreas = new Set<string>();
  for (const log of logs) {
    for (const area of log.affected_areas ?? []) {
      const key = area.trim().toLowerCase();
      if (key) distinctAreas.add(key);
    }
  }

  return {
    logCount,
    currentStreak,
    maxCalmStreak,
    avgItchLast30: last.avg,
    avgItchPrev30: prev.avg,
    improvementRatio,
    analysesCount,
    distinctFoodsCount: distinctFoods.size,
    distinctAreasCount: distinctAreas.size,
  };
}

export function evaluateAchievements(stats: MilestoneStats): MilestoneResult {
  const evaluated: EvaluatedAchievement[] = achievements.map((def) => ({
    ...def,
    evaluation: def.evaluate(stats),
  }));

  const earned = evaluated.filter((a) => a.evaluation.earned);
  const locked = evaluated
    .filter((a) => !a.evaluation.earned)
    .sort((a, b) => b.evaluation.progress - a.evaluation.progress);

  return { stats, earned, locked };
}
