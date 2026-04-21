import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    const epoch = new Date(0).toISOString();
    await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        status: "incomplete",
        current_period_start: epoch,
        current_period_end: epoch,
      },
      { onConflict: "user_id" },
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`,
  });

  return NextResponse.json({ url: session.url });
}
