interface BodyHeatmapProps {
  areas: Array<{ area: string; count: number; percent: number }>;
}

const LABELS: Record<string, string> = {
  face: "Face",
  neck: "Neck",
  chest: "Chest",
  back: "Back",
  arms: "Arms",
  hands: "Hands",
  abdomen: "Abdomen",
  legs: "Legs",
  feet: "Feet",
};

export function BodyHeatmap({ areas }: BodyHeatmapProps) {
  if (areas.length === 0) {
    return (
      <p className="text-sm font-medium text-muted-foreground">
        No affected areas logged yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {areas.map((row) => {
        const label = LABELS[row.area] ?? row.area;
        const pct = Math.round(row.percent * 100);
        return (
          <li key={row.area} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm font-semibold">
              <span className="text-foreground">{label}</span>
              <span className="tabular-nums text-muted-foreground">
                {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.max(pct, 4)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
