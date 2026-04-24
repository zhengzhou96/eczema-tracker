import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserTier } from "@/lib/subscriptions/entitlements";
import { UpgradeButton } from "@/components/upgrade-button";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tier = await getUserTier(user.id);
  const { success } = await searchParams;

  if (tier === "pro" && !success) redirect("/settings");

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-black mb-2">You&apos;re on Pro!</h1>
        <p className="mb-8 text-muted-foreground">All features are now unlocked.</p>
        <Link
          href="/home"
          className="rounded-full bg-primary px-8 py-4 font-bold text-primary-foreground"
        >
          Go to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="pt-10">
        <h1 className="text-2xl font-black mb-1">Upgrade to Pro</h1>
        <p className="mb-8 text-muted-foreground">
          Unlock the full trigger detection engine
        </p>

        <div className="rounded-3xl border border-border bg-card p-6 mb-6">
          <p className="text-4xl font-black mb-0.5">
            $8
            <span className="text-lg font-normal text-muted-foreground">/month</span>
          </p>
          <p className="mb-5 text-xs text-muted-foreground">Cancel anytime</p>
          <ul className="space-y-3">
            {[
              "AI-powered trigger insights",
              "Tomorrow's flare prediction",
              "Weekly skin health reports",
              "CSV export for your doctor",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                  style={{ background: "#9fe870", color: "#163300" }}
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <UpgradeButton />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Free tier: unlimited logging + basic pattern detection — always free.
        </p>
      </div>
    </div>
  );
}
