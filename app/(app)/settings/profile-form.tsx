"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "./actions";

const AGE_RANGES = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"];

const SKIN_TYPES = [
  { value: 1, label: "1 — Very fair (always burns)" },
  { value: 2, label: "2 — Fair (usually burns)" },
  { value: 3, label: "3 — Medium (sometimes burns)" },
  { value: 4, label: "4 — Olive (rarely burns)" },
  { value: 5, label: "5 — Brown (very rarely burns)" },
  { value: 6, label: "6 — Dark (never burns)" },
];

const TRIGGER_OPTIONS = [
  "dairy", "gluten", "eggs", "nuts", "shellfish", "soy",
  "stress", "poor_sleep", "sweat", "alcohol",
  "dust_mites", "pet_dander", "pollen", "fragrance",
  "nickel", "wool", "synthetic_fabrics",
  "cold_weather", "hot_weather",
];

function triggerLabel(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  displayName: string | null;
  ageRange: string | null;
  skinType: number | null;
  knownTriggers: string[];
  saved: boolean;
}

export function ProfileForm({ displayName, ageRange, skinType, knownTriggers, saved }: Props) {
  const [pending, startTransition] = useTransition();
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(
    () => new Set(knownTriggers),
  );
  const [showSaved, setShowSaved] = useState(saved);

  function toggleTrigger(t: string) {
    setSelectedTriggers((prev) => {
      const next = new Set(prev);
      if (next.has(t)) { next.delete(t); } else { next.add(t); }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    // FormData doesn't pick unchecked checkboxes, so we inject selected triggers
    for (const t of selectedTriggers) {
      formData.append("known_triggers", t);
    }
    startTransition(async () => {
      await updateProfile(formData);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="display_name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Display name
        </Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={displayName ?? ""}
          placeholder="Your first name"
          className="h-12 rounded-2xl border-border bg-card text-base font-semibold"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="age_range" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Age range
        </Label>
        <select
          id="age_range"
          name="age_range"
          defaultValue={ageRange ?? ""}
          className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-semibold text-foreground"
        >
          <option value="">— not set —</option>
          {AGE_RANGES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="skin_type" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Skin type (Fitzpatrick)
        </Label>
        <select
          id="skin_type"
          name="skin_type"
          defaultValue={skinType ?? ""}
          className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-semibold text-foreground"
        >
          <option value="">— not set —</option>
          {SKIN_TYPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Known triggers
        </span>
        <div className="flex flex-wrap gap-2">
          {TRIGGER_OPTIONS.map((t) => {
            const selected = selectedTriggers.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTrigger(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {triggerLabel(t)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="h-12 flex-1 rounded-full bg-primary text-base font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {showSaved && (
          <span className="text-sm font-semibold text-primary">Saved ✓</span>
        )}
      </div>
    </form>
  );
}
