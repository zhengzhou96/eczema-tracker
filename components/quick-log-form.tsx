"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuickStatus, saveQuickTags } from "@/app/(app)/log/quick-actions";
import type { SkinStatus } from "@/lib/insights/engine";

const CHIP_OPTIONS = [
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "stress", label: "Stress", emoji: "😰" },
  { id: "poor_sleep", label: "Poor sleep", emoji: "😴" },
  { id: "new_product", label: "New product", emoji: "🧴" },
  { id: "weather", label: "Weather", emoji: "🌦" },
] as const;

type ChipId = (typeof CHIP_OPTIONS)[number]["id"];

interface QuickLogFormProps {
  recentFoods: string[];
  insightCopy: string | null;
  todayLogDate: string;
  todayStatus: SkinStatus | null;
  todayTags: string[];
}

export function QuickLogForm({
  recentFoods,
  insightCopy,
  todayLogDate,
  todayStatus,
  todayTags,
}: QuickLogFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => {
    if (todayStatus !== null) return 4;
    return 1;
  });
  const [savedDate, setSavedDate] = useState<string>(todayLogDate);
  const [selectedStatus, setSelectedStatus] = useState<SkinStatus | null>(todayStatus);
  const [selectedChips, setSelectedChips] = useState<Set<ChipId>>(
    () => new Set(todayTags as ChipId[]),
  );
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
  const [newFood, setNewFood] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleStatusTap(status: SkinStatus) {
    setSelectedStatus(status);
    const result = await saveQuickStatus(status);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSavedDate(todayLogDate);
    setStep(2);
  }

  function toggleChip(chip: ChipId) {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }

  function handleChipsDone() {
    const needsStep3 =
      selectedChips.has("stress") || selectedChips.has("food");
    if (needsStep3) setStep(3);
    else handleFinish([...selectedChips]);
  }

  function handleFinish(tags: string[]) {
    startTransition(async () => {
      const stressVal = tags.includes("stress") ? stressLevel : null;
      const foodList = tags.includes("food") ? [...selectedFoods] : [];
      const result = await saveQuickTags(savedDate, tags, stressVal, foodList);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStep(4);
    });
  }

  function addFood() {
    const trimmed = newFood.trim();
    if (!trimmed) return;
    setSelectedFoods((prev) => new Set([...prev, trimmed]));
    setNewFood("");
  }

  if (step === 1) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <h1 className="text-2xl font-black text-center leading-tight tracking-tight">
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
              onClick={() => handleStatusTap(status)}
              disabled={isPending}
              className="flex items-center justify-center gap-3 rounded-full border-2 border-border bg-background py-4 text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              <span>{emoji}</span> {label}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <p className="text-xs text-muted-foreground">Tap to select. That&apos;s it.</p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex flex-col gap-5 py-6">
        <h2 className="text-xl font-black text-center">Anything notable?</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {CHIP_OPTIONS.map((chip) => {
            const active = selectedChips.has(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => toggleChip(chip.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold border-2 transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <span>{chip.emoji}</span> {chip.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleChipsDone}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Done →
          </button>
          <button
            onClick={() => handleFinish([])}
            className="py-2 text-sm font-semibold text-muted-foreground"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const hasStress = selectedChips.has("stress");
    const hasFood = selectedChips.has("food");
    return (
      <div className="flex flex-col gap-5 py-6">
        {hasStress && (
          <div className="space-y-3">
            <h2 className="text-lg font-black">How stressful was today?</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={stressLevel}
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        )}
        {hasFood && (
          <div className="space-y-3">
            <h2 className="text-lg font-black">Recent foods?</h2>
            <div className="flex flex-col gap-2">
              {recentFoods.map((food) => (
                <button
                  key={food}
                  onClick={() =>
                    setSelectedFoods((prev) => {
                      const next = new Set(prev);
                      if (next.has(food)) next.delete(food);
                      else next.add(food);
                      return next;
                    })
                  }
                  className={`rounded-full border-2 px-4 py-2 text-sm font-semibold text-left transition-colors ${
                    selectedFoods.has(food)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {food}
                </button>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFood}
                  onChange={(e) => setNewFood(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFood()}
                  placeholder="+ Add food…"
                  className="flex-1 rounded-full border-2 border-border bg-background px-4 py-2 text-sm font-semibold outline-none focus:border-primary"
                />
                {newFood && (
                  <button
                    onClick={addFood}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => handleFinish([...selectedChips])}
          disabled={isPending}
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          Done →
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Step 4 — done state
  const copyText = insightCopy ?? "We're starting to detect patterns.";
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary text-2xl">
        ✅
      </div>
      <h2 className="text-2xl font-black">Logged</h2>
      <div className="rounded-2xl border border-primary bg-primary/10 px-5 py-4 max-w-xs">
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          {copyText}
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
        <a
          href="/log?detail=1"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background text-center"
        >
          Add more detail →
        </a>
        <button
          onClick={() => router.push("/home")}
          className="py-2 text-sm font-semibold text-muted-foreground"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
