import { ChevronLeft, Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { DeleteAccountButton } from "./delete-account-button";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, age_range, skin_type, known_triggers")
    .eq("id", user.id)
    .maybeSingle();

  const params = await searchParams;
  const saved = params.saved === "1";

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-1">
        <Link
          href="/you"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
          Back to You
        </Link>
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Settings
        </h1>
      </div>

      {/* Account */}
      <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Account
        </h2>
        <p className="text-base font-semibold">{user.email}</p>
        <form action={signOut}>
          <Button
            type="submit"
            className="h-11 w-full rounded-full bg-secondary text-sm font-semibold text-foreground transition-transform hover:scale-[1.02] hover:bg-secondary active:scale-[0.98]"
          >
            Log out
          </Button>
        </form>
      </section>

      {/* Profile */}
      <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Profile
        </h2>
        <ProfileForm
          displayName={profile?.display_name ?? null}
          ageRange={profile?.age_range ?? null}
          skinType={profile?.skin_type ?? null}
          knownTriggers={profile?.known_triggers ?? []}
          saved={saved}
        />
      </section>

      {/* Export */}
      <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Export your data
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          Download all your logs, foods, and notes as a CSV file you can open in Excel or share with your dermatologist.
        </p>
        <a
          href="/api/export/csv"
          download
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-background text-sm font-semibold text-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="size-4" aria-hidden />
          Download CSV
        </a>
      </section>

      {/* Legal */}
      <section className="space-y-2 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Legal
        </h2>
        <div className="flex flex-col gap-1">
          <Link href="/disclaimer" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            Medical disclaimer →
          </Link>
          <Link href="/privacy" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            Privacy policy →
          </Link>
          <Link href="/terms" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            Terms of service →
          </Link>
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-3 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-destructive">
          Danger zone
        </h2>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
