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

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const cutoff = twoDaysAgo.toISOString().slice(0, 10);

  // Users who logged recently
  const { data: recentLoggers } = await supabase
    .from("daily_logs")
    .select("user_id")
    .gte("log_date", cutoff);

  const activeIds = new Set((recentLoggers ?? []).map((r) => r.user_id));

  // All push subscriptions
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  const inactive = (subs ?? []).filter((s) => !activeIds.has(s.user_id));

  let sent = 0;
  const expired: string[] = [];

  for (const sub of inactive) {
    try {
      await sendPushNotification(sub as StoredSubscription, {
        title: "EczemaTrack",
        body: "Quick check-in — takes 2 seconds. How is your skin today?",
        url: "/log",
      });
      sent++;
    } catch {
      expired.push(sub.endpoint);
    }
  }

  if (expired.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expired);
  }

  return NextResponse.json({ sent, expired: expired.length });
}
