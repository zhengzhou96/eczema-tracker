export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          History
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          Every day you&apos;ve tracked.
        </p>
      </div>
      <div className="rounded-3xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
        Start tracking today — your first log is the hardest, and the most
        valuable.
      </div>
    </div>
  );
}
