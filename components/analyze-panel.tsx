"use client";

import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { renderSimpleMarkdown } from "@/lib/markdown";

type Period = "7d" | "30d";

interface AnalyzeResponse {
  id: string | null;
  createdAt: string;
  result: string;
  period: Period;
  remaining: number;
  limit: number;
}

type AnalyzeSuccess = AnalyzeResponse;
type AnalyzeError = { error: string; remaining?: number };

interface AnalyzePanelProps {
  initialRemaining: number;
  initialLimit: number;
  hasEnoughData: boolean;
}

export function AnalyzePanel({
  initialRemaining,
  initialLimit,
  hasEnoughData,
}: AnalyzePanelProps) {
  const [period, setPeriod] = useState<Period>("7d");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res: Response;
      try {
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period }),
        });
      } catch {
        setError("Network error. Check your connection and try again.");
        return;
      }

      let data: AnalyzeSuccess | AnalyzeError;
      try {
        data = (await res.json()) as AnalyzeSuccess | AnalyzeError;
      } catch {
        setError("Unexpected response from server. Please try again.");
        return;
      }

      if (!res.ok) {
        const err = data as AnalyzeError;
        setError(err.error ?? "Analysis failed. Try again in a moment.");
        if (typeof err.remaining === "number") setRemaining(err.remaining);
        return;
      }
      const ok = data as AnalyzeSuccess;
      setResult(ok.result);
      setRemaining(ok.remaining);
    } finally {
      setLoading(false);
    }
  }

  const canAnalyze = hasEnoughData && remaining > 0 && !loading;

  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          AI insights
        </h2>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {remaining} of {initialLimit} left today
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <PeriodPill
          active={period === "7d"}
          onClick={() => setPeriod("7d")}
          label="7 days"
          disabled={loading}
        />
        <PeriodPill
          active={period === "30d"}
          onClick={() => setPeriod("30d")}
          label="30 days"
          disabled={loading}
        />
      </div>

      <Button
        type="button"
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="mt-4 h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Analyzing your patterns...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 size-4" />
            Analyze my {period === "7d" ? "week" : "month"}
          </>
        )}
      </Button>

      {!hasEnoughData && (
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Log at least 3 days before analyzing so there&apos;s a pattern to find.
        </p>
      )}

      {hasEnoughData && remaining <= 0 && (
        <p className="mt-3 text-xs font-medium text-muted-foreground" aria-live="polite">
          Daily limit reached. Come back tomorrow for more insights.
        </p>
      )}

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-2xl bg-muted/60 p-4">
          {renderSimpleMarkdown(result)}
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <Link
          href="/analyses"
          className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          View past analyses →
        </Link>
      </div>
    </section>
  );
}

function PeriodPill({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={
        "rounded-full px-4 py-2 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed " +
        (active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/80")
      }
    >
      {label}
    </button>
  );
}
