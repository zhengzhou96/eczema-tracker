"use client";

import { useState } from "react";

export function UpgradeButton({ label = "Upgrade to Pro" }: { label?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = (await res.json()) as { url?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
    >
      {loading ? "Loading…" : label}
    </button>
  );
}
