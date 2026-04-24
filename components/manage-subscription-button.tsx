"use client";

import { useState } from "react";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = (await res.json()) as { url?: string };
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="h-10 rounded-full border border-border px-5 text-sm font-bold transition-colors hover:bg-muted disabled:opacity-60"
    >
      {loading ? "Loading…" : "Manage subscription"}
    </button>
  );
}
