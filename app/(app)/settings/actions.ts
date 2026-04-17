"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const known_triggers = formData.getAll("known_triggers") as string[];
  const skin_type_raw = formData.get("skin_type");

  await supabase
    .from("profiles")
    .update({
      display_name: (formData.get("display_name") as string)?.trim() || null,
      age_range: (formData.get("age_range") as string) || null,
      skin_type: skin_type_raw ? Number(skin_type_raw) : null,
      known_triggers,
    })
    .eq("id", user.id);

  redirect("/settings?saved=1");
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Delete in order to satisfy FK constraints (daily_logs CASCADE → food_entries, photos)
  await supabase.from("ai_analyses").delete().eq("user_id", user.id);
  await supabase.from("daily_logs").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await admin.auth.admin.deleteUser(user.id);

  redirect("/login");
}
