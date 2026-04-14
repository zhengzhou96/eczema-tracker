import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { renderSimpleMarkdown } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/server";

export default async function AnalysesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rows } = await supabase
    .from("ai_analyses")
    .select("id, analysis_type, result, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const analyses = rows ?? [];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
          Back to dashboard
        </Link>
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Past analyses
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          Every AI reflection you&apos;ve run, newest first.
        </p>
      </div>

      {analyses.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            No analyses yet.
          </p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Log a few days, then tap &ldquo;Analyze my week&rdquo; on the
            dashboard.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {analyses.map((a) => (
            <li
              key={a.id}
              className="rounded-3xl border border-border bg-card p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {formatAnalysisType(a.analysis_type)}
                </span>
                <time className="text-[11px] font-semibold text-muted-foreground">
                  {formatDate(a.created_at)}
                </time>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4">
                {a.result ? (
                  renderSimpleMarkdown(a.result)
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">
                    Empty result.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="px-2 text-xs font-medium text-muted-foreground">
        This is not medical advice. Please consult your dermatologist for
        treatment decisions.
      </p>
    </div>
  );
}

function formatAnalysisType(type: string): string {
  if (type === "weekly_7d") return "7-day reflection";
  if (type === "weekly_30d") return "30-day reflection";
  return type;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
