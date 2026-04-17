import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escape).join(",");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: logs } = await supabase
    .from("daily_logs")
    .select("id, log_date, itch_level, stress_level, sleep_hours, sleep_quality, affected_areas, notes, skin_status, quick_tags")
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  const { data: foods } = await supabase
    .from("food_entries")
    .select("log_id, food_name, category, notes")
    .in("log_id", (logs ?? []).map((l) => l.id));

  const foodsByLogId = new Map<string, string[]>();
  for (const f of foods ?? []) {
    const existing = foodsByLogId.get(f.log_id) ?? [];
    existing.push(f.food_name);
    foodsByLogId.set(f.log_id, existing);
  }

  const header = row([
    "Date", "Itch Level", "Stress Level", "Sleep Hours", "Sleep Quality",
    "Skin Status", "Affected Areas", "Quick Tags", "Foods", "Notes",
  ]);

  const lines = (logs ?? []).map((l) =>
    row([
      l.log_date,
      l.itch_level,
      l.stress_level,
      l.sleep_hours,
      l.sleep_quality,
      l.skin_status,
      (l.affected_areas ?? []).join("; "),
      (l.quick_tags ?? []).join("; "),
      (foodsByLogId.get(l.id) ?? []).join("; "),
      l.notes,
    ]),
  );

  const csv = [header, ...lines].join("\n");
  const filename = `eczema-logs-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
