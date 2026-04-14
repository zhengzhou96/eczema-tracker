import { tips, type Tip } from "@/content/tips";

export function getTodaysTip(today: Date = new Date()): Tip {
  const start = Date.UTC(today.getUTCFullYear(), 0, 0);
  const now = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const dayOfYear = Math.floor((now - start) / 86_400_000);
  return tips[dayOfYear % tips.length];
}

export type { Tip };
