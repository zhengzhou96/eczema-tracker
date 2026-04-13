"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface LevelSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  labels?: [string, string];
  accent?: "primary" | "warning" | "info";
}

export function LevelSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  labels = ["None", "Severe"],
  accent = "primary",
}: LevelSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span
          className={cn(
            "text-3xl font-black leading-none tracking-tight tabular-nums",
            accent === "warning" && "text-[#d97706]",
            accent === "info" && "text-[#0ea5e9]",
          )}
        >
          {value}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0] ?? min)}
      />
      <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
      </div>
    </div>
  );
}
