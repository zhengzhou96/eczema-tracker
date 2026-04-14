"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DayLog = {
  itch_level: number | null;
  stress_level: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  affected_areas: string[] | null;
  notes: string | null;
};

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  isFuture: boolean;
  isToday: boolean;
  log: DayLog | null;
};

function toneForItch(itch: number | null): string {
  if (itch === null) return "bg-muted text-foreground";
  if (itch <= 2) return "bg-emerald-500/25 text-emerald-900 dark:text-emerald-100";
  if (itch <= 5) return "bg-amber-400/35 text-amber-900 dark:text-amber-100";
  if (itch <= 8) return "bg-orange-500/45 text-orange-950 dark:text-orange-50";
  return "bg-red-500/55 text-red-950 dark:text-red-50";
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function CalendarGrid({ days }: { days: CalendarDay[] }) {
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {days.map((day, idx) => {
          if (!day.inMonth) {
            return <div key={`blank-${idx}`} aria-hidden />;
          }
          if (day.isFuture) {
            return (
              <div
                key={day.date}
                className="flex aspect-square items-center justify-center rounded-xl text-sm font-semibold text-muted-foreground/40"
              >
                {day.dayOfMonth}
              </div>
            );
          }
          const hasLog = day.log !== null;
          const tone = hasLog
            ? toneForItch(day.log?.itch_level ?? null)
            : "border border-dashed border-border text-muted-foreground";
          const label = hasLog
            ? day.log?.itch_level !== null
              ? `${day.date}, itch ${day.log?.itch_level} of 10`
              : `${day.date}, logged`
            : `${day.date}, not logged`;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelected(day)}
              aria-label={label}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-sm font-bold transition-transform hover:scale-[1.05] active:scale-95",
                tone,
                day.isToday &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              {day.dayOfMonth}
            </button>
          );
        })}
      </div>

      {selected && (
        <DayDetailOverlay day={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function DayDetailOverlay({
  day,
  onClose,
}: {
  day: CalendarDay;
  onClose: () => void;
}) {
  const log = day.log;
  const dateLabel = new Date(day.date + "T00:00:00Z").toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    },
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${dateLabel}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-3xl bg-card p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black leading-tight">{dateLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform hover:scale-105 hover:text-foreground active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        {log ? (
          <div className="mt-5 space-y-3">
            <StatRow label="Itch" value={log.itch_level} unit="/ 10" />
            <StatRow label="Stress" value={log.stress_level} unit="/ 10" />
            <StatRow label="Sleep" value={log.sleep_hours} unit="hrs" />
            <StatRow
              label="Sleep quality"
              value={log.sleep_quality}
              unit="/ 10"
            />
            {log.affected_areas && log.affected_areas.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Affected areas
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {log.affected_areas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {log.notes && (
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {log.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-5 text-sm font-medium text-muted-foreground">
            No log for this day.
          </p>
        )}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-2 last:border-b-0">
      <span className="text-sm font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-black tabular-nums">
        {value ?? "—"}{" "}
        <span className="text-xs font-semibold text-muted-foreground">
          {unit}
        </span>
      </span>
    </div>
  );
}
