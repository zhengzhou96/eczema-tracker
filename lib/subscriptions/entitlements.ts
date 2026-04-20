import { createClient } from "@/lib/supabase/server";
import type { Finding } from "@/lib/insights/engine";
import type { Subscription } from "@/lib/supabase/types";

export type Tier = "free" | "pro";

export async function getUserTier(userId: string): Promise<Tier> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle<Subscription>();

  if (!data) return "free";
  if (data.status !== "active") return "free";
  if (data.current_period_end && new Date(data.current_period_end) < new Date())
    return "free";
  return "pro";
}

export function findingBasicDescription(finding: Finding): string {
  switch (finding.rule) {
    case "stress_flare":
      return `Stress preceded a flare ${finding.matchCount} time${finding.matchCount === 1 ? "" : "s"}`;
    case "sleep_flare":
      return `Poor sleep preceded a flare ${finding.matchCount} time${finding.matchCount === 1 ? "" : "s"}`;
    case "food_flare":
      return (
        finding.supportingData ?? "A food may be linked to your flares"
      );
    case "frequent_flares":
      return (
        finding.supportingData ?? `${finding.matchCount} flares detected recently`
      );
    case "clear_streak":
      return `${finding.matchCount} consecutive clear days`;
  }
}
