import { Bookmark, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CATEGORY_LABELS, routines } from "@/content/routines";
import { createClient } from "@/lib/supabase/server";

export default async function RoutinesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: savedRows } = await supabase
    .from("saved_routines")
    .select("routine_id")
    .eq("user_id", user.id);

  const savedIds = new Set((savedRows ?? []).map((r) => r.routine_id));

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
        Routines
      </h1>
      <p className="text-sm font-medium text-muted-foreground">
        Step-by-step protocols curated by the team. Save the ones that fit your
        life.
      </p>
      <div className="space-y-3">
        {routines.map((routine) => (
          <Link
            key={routine.id}
            href={`/routines/${routine.id}`}
            className="block rounded-[30px] border border-border bg-card p-5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
                    style={{ backgroundColor: "#e2f6d5", color: "#163300" }}
                  >
                    {CATEGORY_LABELS[routine.category]}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Clock className="size-3" aria-hidden />~
                    {routine.estimatedMinutes} min
                  </span>
                </div>
                <p className="text-base font-black leading-tight">
                  {routine.title}
                </p>
                <p className="line-clamp-2 text-xs font-medium text-muted-foreground">
                  {routine.intro}
                </p>
              </div>
              {savedIds.has(routine.id) && (
                <Bookmark
                  className="mt-1 size-5 shrink-0"
                  aria-label="Saved"
                  style={{ color: "#163300", fill: "#163300" }}
                />
              )}
            </div>
          </Link>
        ))}
      </div>
      <p className="px-2 text-xs font-medium text-muted-foreground">
        This is not medical advice. Please consult your dermatologist for
        treatment decisions.
      </p>
    </div>
  );
}
