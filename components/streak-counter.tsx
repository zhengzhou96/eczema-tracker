import { Flame } from "lucide-react";

interface StreakCounterProps {
  streak: number;
}

export function StreakCounter({ streak }: StreakCounterProps) {
  const label =
    streak === 0
      ? "Start your streak"
      : streak === 1
        ? "day tracked"
        : "day streak";

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Flame className="size-7" strokeWidth={2.5} />
      </div>
      <div className="flex-1">
        <div className="text-4xl font-black leading-none tabular-nums">
          {streak}
        </div>
        <div className="mt-1 text-sm font-semibold text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
