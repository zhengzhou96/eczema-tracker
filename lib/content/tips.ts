import { tips, type Tip } from "@/content/tips";

function getDayOfYear(today: Date): number {
  const start = Date.UTC(today.getUTCFullYear(), 0, 0);
  const now = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.floor((now - start) / 86_400_000);
}

export function getTodaysTip(today: Date = new Date()): Tip {
  return tips[getDayOfYear(today) % tips.length];
}

export function getTips(count: number, today: Date = new Date()): Tip[] {
  const base = getDayOfYear(today);
  return Array.from(
    { length: count },
    (_, i) => tips[(base + i) % tips.length],
  );
}

export type { Tip };
