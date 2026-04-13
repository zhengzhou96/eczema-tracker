import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initial =
    user?.email?.trim().charAt(0).toUpperCase() ?? "•";

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between px-5 py-3">
        <Link
          href="/dashboard"
          className="text-lg font-black tracking-tight"
        >
          EczemaTrack
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
