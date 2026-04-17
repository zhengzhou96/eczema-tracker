"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveQuickStatus } from "@/app/(app)/log/quick-actions";
import { markOnboarded } from "@/app/onboarding/actions";
import type { SkinStatus } from "@/lib/insights/engine";

export function OnboardingFlow() {
  const router = useRouter();
  const [screen, setScreen] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleFirstLog(status: SkinStatus) {
    startTransition(async () => {
      const [statusResult, onboardResult] = await Promise.all([
        saveQuickStatus(status),
        markOnboarded(),
      ]);
      if ("error" in statusResult) {
        setError(statusResult.error);
        return;
      }
      if ("error" in onboardResult) {
        setError(onboardResult.error);
        return;
      }
      router.push("/log");
    });
  }

  if (screen === 1) {
    return (
      <div
        className="min-h-screen flex flex-col justify-between p-8"
        style={{ background: "#163300" }}
      >
        <div className="pt-12">
          <div className="text-5xl mb-6">🔍</div>
          <h1 className="text-3xl font-black text-white leading-tight mb-4">
            Let&apos;s figure out what&apos;s triggering your eczema
          </h1>
          <p className="text-white/60 text-base">
            No long tracking. Just quick check-ins.
          </p>
        </div>
        <button
          onClick={() => setScreen(2)}
          className="w-full rounded-full py-4 font-bold text-base"
          style={{ background: "#9fe870", color: "#163300" }}
        >
          Continue →
        </button>
      </div>
    );
  }

  if (screen === 2) {
    return (
      <div className="min-h-screen flex flex-col justify-between p-8 bg-background">
        <div className="pt-12">
          <div className="text-5xl mb-6">😌</div>
          <h1 className="text-3xl font-black leading-tight mb-4">
            You don&apos;t need to be consistent
          </h1>
          <p className="text-muted-foreground text-base mb-6">
            Even occasional logs help us find patterns. No streaks to maintain.
            No guilt.
          </p>
          <div className="rounded-2xl border border-primary bg-primary/10 p-4">
            <p className="text-sm font-semibold text-foreground">
              &ldquo;Even small inputs help&rdquo;
            </p>
          </div>
        </div>
        <button
          onClick={() => setScreen(3)}
          className="w-full rounded-full bg-primary py-4 font-bold text-base text-primary-foreground"
        >
          Got it →
        </button>
      </div>
    );
  }

  if (screen === 3) {
    return (
      <div className="min-h-screen flex flex-col justify-between p-8 bg-background">
        <div className="pt-12">
          <h1 className="text-3xl font-black leading-tight mb-8">
            How it works
          </h1>
          <div className="flex flex-col gap-5">
            {[
              "Tap how your skin feels",
              "Add quick context (optional)",
              "We detect your patterns",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-full font-black text-sm"
                  style={{ background: "#9fe870", color: "#163300" }}
                >
                  {i + 1}
                </div>
                <p className="text-base font-semibold pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => setScreen(4)}
          className="w-full rounded-full bg-primary py-4 font-bold text-base text-primary-foreground"
        >
          Next →
        </button>
      </div>
    );
  }

  if (screen === 4) {
    return (
      <div className="min-h-screen flex flex-col justify-between p-8 bg-background">
        <div className="pt-12">
          <div className="text-5xl mb-6">🧠</div>
          <h1 className="text-3xl font-black leading-tight mb-4">
            Most users discover their top trigger within 7 days
          </h1>
          <p className="text-muted-foreground text-base">
            Stress, food, sleep — patterns emerge faster than you&apos;d think.
          </p>
        </div>
        <button
          onClick={() => setScreen(5)}
          className="w-full rounded-full bg-primary py-4 font-bold text-base text-primary-foreground"
        >
          Let&apos;s go →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <h1 className="text-2xl font-black text-center mb-8">
        How is your skin today?
      </h1>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {(
          [
            { status: "clear" as const, emoji: "👍", label: "Clear" },
            { status: "mild" as const, emoji: "😐", label: "Mild" },
            { status: "flare" as const, emoji: "🔥", label: "Flare" },
          ] as const
        ).map(({ status, emoji, label }) => (
          <button
            key={status}
            onClick={() => handleFirstLog(status)}
            disabled={isPending}
            className="flex items-center justify-center gap-3 rounded-full border-2 border-border bg-background py-4 text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            <span>{emoji}</span> {label}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <p className="mt-6 text-xs text-muted-foreground">
        Your first log. Takes 2 seconds.
      </p>
      <p className="mt-4 text-[11px] text-muted-foreground/60 text-center leading-relaxed">
        Not medical advice. By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </div>
  );
}
