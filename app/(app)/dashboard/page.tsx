export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Dashboard
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          Your streak, trends, and pattern analysis live here.
        </p>
      </div>
      <div className="rounded-3xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
        Charts unlock after your first 7 days of logs.
      </div>
    </div>
  );
}
