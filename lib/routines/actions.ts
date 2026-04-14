"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveRoutine(routineId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("saved_routines")
    .insert({ user_id: user.id, routine_id: routineId });

  revalidatePath("/routines");
  revalidatePath(`/routines/${routineId}`);
}

export async function unsaveRoutine(routineId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("saved_routines")
    .delete()
    .eq("user_id", user.id)
    .eq("routine_id", routineId);

  revalidatePath("/routines");
  revalidatePath(`/routines/${routineId}`);
}
