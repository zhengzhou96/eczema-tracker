export default function LogPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Today&apos;s log
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          Sixty seconds. That&apos;s all it takes.
        </p>
      </div>
      <div className="rounded-3xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
        The daily log form lands in Session 3.
      </div>
    </div>
  );
}
