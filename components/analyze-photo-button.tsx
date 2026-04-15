"use client";

import { Loader2, Microscope } from "lucide-react";
import { useState } from "react";

interface AnalyzeResult {
  id: string | null;
  result: string;
  remaining: number;
}

export function AnalyzePhotoButton({ photoId }: { photoId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleAnalyze() {
    setState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      const json = (await res.json()) as
        | AnalyzeResult
        | { error: string; remaining?: number };

      if (!res.ok) {
        setErrorMsg(
          (json as { error: string }).error ?? "Something went wrong.",
        );
        setState("error");
        return;
      }

      setResult(json as AnalyzeResult);
      setState("done");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  if (state === "done" && result) {
    return (
      <div className="space-y-2">
        <div className="rounded-2xl bg-primary/10 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">
            Skin observation
          </p>
          <p className="text-sm font-medium leading-relaxed text-foreground">
            {result.result}
          </p>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground">
          {result.remaining === 0
            ? "No photo observations remaining today."
            : `${result.remaining} observation${result.remaining === 1 ? "" : "s"} remaining today.`}
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">{errorMsg}</p>
        <button
          onClick={() => setState("idle")}
          className="text-xs font-semibold text-muted-foreground underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleAnalyze}
      disabled={state === "loading"}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
      style={{ backgroundColor: "#9fe870", color: "#163300" }}
    >
      {state === "loading" ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Observing…
        </>
      ) : (
        <>
          <Microscope className="size-4" aria-hidden />
          Get skin observation
        </>
      )}
    </button>
  );
}
