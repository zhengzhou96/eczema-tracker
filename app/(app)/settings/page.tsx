import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Settings
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          Profile, preferences, and data — all in Session 6.
        </p>
      </div>

      <div className="space-y-2 rounded-3xl border border-border p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Signed in as
        </p>
        <p className="text-base font-semibold">{user?.email}</p>
      </div>

      <form action={signOut}>
        <Button
          type="submit"
          className="h-12 w-full rounded-full bg-secondary text-base font-semibold text-foreground transition-transform hover:scale-[1.02] hover:bg-secondary active:scale-[0.98]"
        >
          Log out
        </Button>
      </form>
    </div>
  );
}
