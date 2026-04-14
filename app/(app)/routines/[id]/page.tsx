import { Clock, ExternalLink } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { SaveRoutineButton } from "@/components/save-routine-button";
import { CATEGORY_LABELS, routines } from "@/content/routines";
import { createClient } from "@/lib/supabase/server";

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const routine = routines.find((r) => r.id === id);
  if (!routine) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: savedRow } = await supabase
    .from("saved_routines")
    .select("id")
    .eq("user_id", user.id)
    .eq("routine_id", id)
    .maybeSingle();

  const isSaved = savedRow !== null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          {routine.title}
        </h1>
        <SaveRoutineButton routineId={routine.id} initialSaved={isSaved} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
          style={{ backgroundColor: "#e2f6d5", color: "#163300" }}
        >
          {CATEGORY_LABELS[routine.category]}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Clock className="size-3" aria-hidden />~{routine.estimatedMinutes}{" "}
          min
        </span>
      </div>

      <p className="text-sm font-medium text-muted-foreground">
        {routine.intro}
      </p>

      <div className="space-y-4 rounded-[30px] border border-border bg-card p-5">
        {routine.steps.map((step, index) => (
          <div key={index} className="flex gap-4">
            <span
              className="mt-0.5 shrink-0 text-2xl font-black leading-none"
              style={{ color: "rgba(14,15,12,0.15)" }}
            >
              {index + 1}
            </span>
            <div className="space-y-1">
              <p
                className="text-base font-semibold leading-snug"
                style={{ letterSpacing: "-0.108px" }}
              >
                {step.title}
              </p>
              <p className="text-sm font-normal leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <a
        href={routine.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:underline"
      >
        Source: {routine.source}
        <ExternalLink className="size-3" aria-hidden />
      </a>

      <p className="px-2 text-xs font-medium text-muted-foreground">
        This is not medical advice. Please consult your dermatologist for
        treatment decisions.
      </p>
    </div>
  );
}
