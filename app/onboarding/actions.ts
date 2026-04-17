"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { success: true } | { error: string };

export async function markOnboarded(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ has_onboarded: true })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
