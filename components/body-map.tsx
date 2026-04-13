"use client";

import { cn } from "@/lib/utils";

const BODY_AREAS = [
  { key: "face", label: "Face" },
  { key: "neck", label: "Neck" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "arms", label: "Arms" },
  { key: "hands", label: "Hands" },
  { key: "abdomen", label: "Abdomen" },
  { key: "legs", label: "Legs" },
  { key: "feet", label: "Feet" },
] as const;

export type BodyAreaKey = (typeof BODY_AREAS)[number]["key"];

interface BodyMapProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function BodyMap({ value, onChange }: BodyMapProps) {
  const selected = new Set(value);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(Array.from(next));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {BODY_AREAS.map((area) => {
          const active = selected.has(area.key);
          return (
            <button
              key={area.key}
              type="button"
              onClick={() => toggle(area.key)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-foreground hover:border-foreground/40",
              )}
            >
              {area.label}
            </button>
          );
        })}
      </div>
      {selected.size > 0 && (
        <p className="text-xs font-medium text-muted-foreground">
          {selected.size} area{selected.size === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}
