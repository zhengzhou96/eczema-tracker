const SKIN_EMOJI: Record<string, string> = {
  clear: "👍",
  mild: "😐",
  flare: "🔥",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayData {
  date: string; // YYYY-MM-DD
  skinStatus: "clear" | "mild" | "flare" | null;
}

interface WeekStripProps {
  days: DayData[];
  showLabels?: boolean;
}

export function WeekStrip({ days, showLabels = true }: WeekStripProps) {
  return (
    <div className="flex gap-1.5 items-end justify-between">
      {days.map((day, i) => {
        const emoji = day.skinStatus ? SKIN_EMOJI[day.skinStatus] : null;
        return (
          <div
            key={day.date}
            className="flex flex-1 flex-col items-center gap-1"
            style={{ opacity: emoji ? 1 : 0.3 }}
          >
            <span className="text-xl leading-none" aria-label={day.skinStatus ?? "no entry"}>
              {emoji ?? "—"}
            </span>
            {showLabels && (
              <span className="text-[9px] font-semibold text-muted-foreground">
                {DAY_LABELS[i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Builds a 7-element DayData array for Mon–Sun of the week containing `today`.
 * `logsByDate` is a Map from YYYY-MM-DD to skin status.
 */
export function buildWeekDays(
  today: string,
  logsByDate: Map<string, "clear" | "mild" | "flare">,
): DayData[] {
  const [y, m, d] = today.split("-").map(Number);
  const todayDate = new Date(y!, (m ?? 1) - 1, d ?? 1);
  // ISO week starts Monday; JS getDay() is 0=Sun
  const jsDay = todayDate.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(todayDate);
  monday.setDate(monday.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const iso = date.toISOString().slice(0, 10);
    return { date: iso, skinStatus: logsByDate.get(iso) ?? null };
  });
}
