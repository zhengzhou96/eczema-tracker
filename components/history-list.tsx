"use client";

import { useState } from "react";
import Link from "next/link";

interface HistoryEntry {
  id: string;
  log_date: string;
  skin_status: "clear" | "mild" | "flare" | null;
  quick_tags: string[];
  itch_level: number | null;
  sleep_hours: number | null;
  stress_level: number | null;
  notes: string | null;
}

interface HistoryListProps {
  entries: HistoryEntry[];
}

const SKIN_EMOJI: Record<string, string> = {
  clear: "👍",
  mild: "😐",
  flare: "🔥",
};

const TAG_EMOJI: Record<string, string> = {
  stress: "😰 Stress",
  poor_sleep: "😴 Poor sleep",
  food: "🍜 Food",
  new_product: "🧴 New product",
  weather: "🌦 Weather",
};

function formatLogDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function HistoryList({ entries }: HistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
        Log once to start discovering patterns
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const emoji = entry.skin_status ? SKIN_EMOJI[entry.skin_status] : "—";
        const tagLabels = entry.quick_tags
          .map((t) => TAG_EMOJI[t] ?? t)
          .join(" · ");

        return (
          <div
            key={entry.id}
            className={`rounded-2xl border overflow-hidden transition-colors ${
              isExpanded ? "border-primary" : "border-border bg-card"
            }`}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              aria-expanded={isExpanded}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground">
                  {formatLogDate(entry.log_date)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {tagLabels || "No tags"}
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {isExpanded ? "↑" : "↓"}
              </span>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2">
                {entry.itch_level != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Itch</span>
                    <span className="font-bold">{entry.itch_level}/10</span>
                  </div>
                )}
                {entry.stress_level != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Stress level</span>
                    <span className="font-bold">
                      {entry.stress_level <= 3
                        ? "Low"
                        : entry.stress_level <= 6
                          ? "Medium"
                          : "High"}
                    </span>
                  </div>
                )}
                {entry.sleep_hours != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Sleep</span>
                    <span className="font-bold">{entry.sleep_hours}h</span>
                  </div>
                )}
                {entry.notes && (
                  <p className="text-xs text-foreground/80 pt-1">{entry.notes}</p>
                )}
                <Link
                  href="/log?detail=1"
                  className="inline-block mt-2 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  Edit →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
