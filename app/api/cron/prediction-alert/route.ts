import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushNotification } from "@/lib/push/web-push";
import { getPrediction } from "@/lib/insights/engine";
import type { InsightLog } from "@/lib/insights/engine";
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

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const expired: string[] = [];

  for (const sub of subs) {
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("log_date, skin_status, quick_tags, stress_level, itch_level")
      .eq("user_id", sub.user_id)
      .order("log_date", { ascending: false })
      .limit(5);

    const insightLogs: InsightLog[] = (logs ?? []).map((l) => ({
      log_date: l.log_date,
      skin_status: l.skin_status as InsightLog["skin_status"],
      quick_tags: l.quick_tags ?? [],
      stress_level: l.stress_level,
      itch_level: l.itch_level,
    }));

    if (getPrediction(insightLogs) !== "elevated") continue;

    try {
      await sendPushNotification(sub as StoredSubscription, {
        title: "Heads up — elevated skin risk tomorrow",
        body: "Your recent pattern suggests tomorrow might be a tough day. Consider reducing stress and getting good sleep.",
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
