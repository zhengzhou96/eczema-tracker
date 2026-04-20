import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushNotification } from "@/lib/push/web-push";
import type { StoredSubscription } from "@/lib/push/web-push";

export const runtime = "nodejs";

function authorized(req: Request): boolean {
  return (
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const expired: string[] = [];

  for (const sub of subs) {
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("skin_status")
      .eq("user_id", sub.user_id)
      .gte("log_date", since);

    const statuses = (logs ?? []).map((l) => l.skin_status).filter(Boolean);
    if (statuses.length === 0) continue;

    const flareCount = statuses.filter((s) => s === "flare").length;
    const clearCount = statuses.filter((s) => s === "clear").length;

    const parts: string[] = [];
    if (flareCount > 0)
      parts.push(`${flareCount} flare day${flareCount > 1 ? "s" : ""}`);
    if (clearCount > 0)
      parts.push(`${clearCount} clear day${clearCount > 1 ? "s" : ""}`);
    const summary = parts.join(", ") || `${statuses.length} days logged`;

    try {
      await sendPushNotification(sub as StoredSubscription, {
        title: "Your weekly skin summary",
        body: `This week: ${summary}. Tap to see your patterns.`,
        url: "/home",
      });
      sent++;
    } catch {
      expired.push(sub.endpoint);
    }
  }

  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }

  return NextResponse.json({ sent, expired: expired.length });
}
