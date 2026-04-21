import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    const periodEnd = sub.items.data[0]?.current_period_end;
    await supabase
      .from("subscriptions")
      .update({
        stripe_subscription_id: sub.id,
        status: sub.status,
        current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      })
      .eq("stripe_customer_id", customerId);
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await supabase
      .from("subscriptions")
      .update({ status: "canceled", stripe_subscription_id: null })
      .eq("stripe_customer_id", sub.customer as string);
  }

  return NextResponse.json({ received: true });
}
