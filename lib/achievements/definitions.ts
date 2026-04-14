import {
  BrainCircuit,
  Flame,
  Play,
  Sparkles,
  TrendingDown,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export type AchievementCategory = "logging" | "progress" | "insights";

export interface MilestoneStats {
  logCount: number;
  currentStreak: number;
  maxCalmStreak: number;
  avgItchLast30: number | null;
  avgItchPrev30: number | null;
  improvementRatio: number | null;
  analysesCount: number;
  distinctFoodsCount: number;
  distinctAreasCount: number;
}

export interface AchievementEvaluation {
  earned: boolean;
  progress: number;
  caption: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: AchievementCategory;
  evaluate: (stats: MilestoneStats) => AchievementEvaluation;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export const achievements: AchievementDef[] = [
  {
    id: "first-log",
    title: "First Log",
    description: "Log your first day to get started.",
    icon: Play,
    category: "logging",
    evaluate: (s) => ({
      earned: s.logCount >= 1,
      progress: s.logCount >= 1 ? 1 : 0,
      caption: s.logCount >= 1 ? "Earned" : "Log your first day",
    }),
  },
  {
    id: "week-of-logs",
    title: "Week of Logs",
    description: "Log seven days in a row.",
    icon: Flame,
    category: "logging",
    evaluate: (s) => ({
      earned: s.currentStreak >= 7,
      progress: clamp01(s.currentStreak / 7),
      caption: `${Math.min(s.currentStreak, 7)} of 7 days`,
    }),
  },
  {
    id: "two-weeks-strong",
    title: "Two Weeks Strong",
    description: "Keep a 14-day logging streak.",
    icon: Flame,
    category: "logging",
    evaluate: (s) => ({
      earned: s.currentStreak >= 14,
      progress: clamp01(s.currentStreak / 14),
      caption: `${Math.min(s.currentStreak, 14)} of 14 days`,
    }),
  },
  {
    id: "month-marathon",
    title: "Month Marathon",
    description: "Log every day for 30 days.",
    icon: Trophy,
    category: "logging",
    evaluate: (s) => ({
      earned: s.currentStreak >= 30,
      progress: clamp01(s.currentStreak / 30),
      caption: `${Math.min(s.currentStreak, 30)} of 30 days`,
    }),
  },
  {
    id: "calm-streak",
    title: "Calm Streak",
    description: "Five days in a row with itch at 5 or below.",
    icon: Sparkles,
    category: "progress",
    evaluate: (s) => ({
      earned: s.maxCalmStreak >= 5,
      progress: clamp01(s.maxCalmStreak / 5),
      caption: `${Math.min(s.maxCalmStreak, 5)} of 5 calm days`,
    }),
  },
  {
    id: "improving",
    title: "Improving",
    description:
      "Your last 30 days average at least 30% lower itch than the 30 days before.",
    icon: TrendingDown,
    category: "progress",
    evaluate: (s) => {
      if (s.improvementRatio == null) {
        return {
          earned: false,
          progress: 0,
          caption: "Need 60 days of data",
        };
      }
      const earned = s.improvementRatio >= 0.3;
      const pct = Math.round(s.improvementRatio * 100);
      return {
        earned,
        progress: clamp01(s.improvementRatio / 0.3),
        caption: earned ? `${pct}% lower` : `${pct}% of 30% needed`,
      };
    },
  },
  {
    id: "dramatic-drop",
    title: "Dramatic Drop",
    description:
      "Your last 30 days average at least 60% lower itch than the 30 days before.",
    icon: Trophy,
    category: "progress",
    evaluate: (s) => {
      if (s.improvementRatio == null) {
        return {
          earned: false,
          progress: 0,
          caption: "Need 60 days of data",
        };
      }
      const earned = s.improvementRatio >= 0.6;
      const pct = Math.round(s.improvementRatio * 100);
      return {
        earned,
        progress: clamp01(s.improvementRatio / 0.6),
        caption: earned ? `${pct}% lower` : `${pct}% of 60% needed`,
      };
    },
  },
  {
    id: "patterns-found",
    title: "Patterns Found",
    description: "Run three AI analyses on your data.",
    icon: BrainCircuit,
    category: "insights",
    evaluate: (s) => ({
      earned: s.analysesCount >= 3,
      progress: clamp01(s.analysesCount / 3),
      caption: `${Math.min(s.analysesCount, 3)} of 3 analyses`,
    }),
  },
  {
    id: "trigger-tracker",
    title: "Trigger Tracker",
    description: "Log ten different foods to help spot food triggers.",
    icon: Utensils,
    category: "logging",
    evaluate: (s) => ({
      earned: s.distinctFoodsCount >= 10,
      progress: clamp01(s.distinctFoodsCount / 10),
      caption: `${Math.min(s.distinctFoodsCount, 10)} of 10 distinct foods`,
    }),
  },
  {
    id: "body-mapper",
    title: "Body Mapper",
    description: "Log five different affected body areas.",
    icon: Sparkles,
    category: "logging",
    evaluate: (s) => ({
      earned: s.distinctAreasCount >= 5,
      progress: clamp01(s.distinctAreasCount / 5),
      caption: `${Math.min(s.distinctAreasCount, 5)} of 5 areas`,
    }),
  },
];
