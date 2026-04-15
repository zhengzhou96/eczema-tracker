export function CalendarLegend() {
  const items = [
    { label: "Calm 0–2", cls: "bg-emerald-500/25" },
    { label: "Mild 3–5", cls: "bg-amber-400/35" },
    { label: "Flared 6–8", cls: "bg-orange-500/45" },
    { label: "Severe 9–10", cls: "bg-red-500/55" },
    { label: "No log", cls: "border border-dashed border-border" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <div
          key={i.label}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold text-muted-foreground"
        >
          <div className={`size-3 rounded ${i.cls}`} />
          {i.label}
        </div>
      ))}
    </div>
  );
}
