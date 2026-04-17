"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { BodyMap } from "@/components/body-map";
import { FoodDiary, type FoodItem } from "@/components/food-diary";
import { LevelSlider } from "@/components/itch-slider";
import { PhotoCapture, type PendingPhoto } from "@/components/photo-capture";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveDailyLog } from "./actions";

interface LogFormProps {
  initial?: {
    itch_level: number;
    stress_level: number;
    sleep_hours: string;
    sleep_quality: number;
    affected_areas: string[];
    notes: string;
    foods: FoodItem[];
    savedPhotoCount: number;
  };
}

const defaultInitial: NonNullable<LogFormProps["initial"]> = {
  itch_level: 0,
  stress_level: 0,
  sleep_hours: "",
  sleep_quality: 5,
  affected_areas: [],
  notes: "",
  foods: [],
  savedPhotoCount: 0,
};

export function LogForm({ initial = defaultInitial }: LogFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [itch, setItch] = useState(initial.itch_level);
  const [stress, setStress] = useState(initial.stress_level);
  const [sleepHours, setSleepHours] = useState(initial.sleep_hours);
  const [sleepQuality, setSleepQuality] = useState(initial.sleep_quality);
  const [areas, setAreas] = useState<string[]>(initial.affected_areas);
  const [foods, setFoods] = useState<FoodItem[]>(initial.foods);
  const [notes, setNotes] = useState(initial.notes);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set("itch_level", String(itch));
    formData.set("stress_level", String(stress));
    formData.set("sleep_hours", sleepHours);
    formData.set("sleep_quality", String(sleepQuality));
    formData.set("affected_areas", JSON.stringify(areas));
    formData.set("foods", JSON.stringify(foods.map((f) => f.name)));
    formData.set("notes", notes);
    for (const photo of photos) {
      formData.append("photos", photo.file, `${photo.id}.jpg`);
    }

    startTransition(async () => {
      const result = await saveDailyLog(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPhotos([]);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      <Section title="Itch">
        <LevelSlider
          label="Today's itch"
          value={itch}
          onChange={setItch}
          labels={["None", "Unbearable"]}
        />
      </Section>

      <Section title="Stress">
        <LevelSlider
          label="Stress level"
          value={stress}
          onChange={setStress}
          labels={["Calm", "Overwhelmed"]}
          accent="warning"
        />
      </Section>

      <Section title="Sleep">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sleep-hours">Hours slept</Label>
            <Input
              id="sleep-hours"
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0}
              max={24}
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="e.g. 7.5"
              className="h-12 rounded-xl text-base"
            />
          </div>
          <LevelSlider
            label="Sleep quality"
            value={sleepQuality}
            onChange={setSleepQuality}
            labels={["Terrible", "Great"]}
            accent="info"
          />
        </div>
      </Section>

      <Section title="Affected areas">
        <BodyMap value={areas} onChange={setAreas} />
      </Section>

      <Section title="Food diary">
        <FoodDiary items={foods} onChange={setFoods} />
      </Section>

      <Section title="Photos">
        <PhotoCapture photos={photos} onChange={setPhotos} />
        {initial.savedPhotoCount > 0 && (
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {initial.savedPhotoCount} photo
            {initial.savedPhotoCount === 1 ? "" : "s"} already saved for today
          </p>
        )}
      </Section>

      <Section title="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Anything else worth remembering?"
        />
      </Section>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
        >
          {error}
        </p>
      )}
      {saved && !error && (
        <p
          role="status"
          className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary"
        >
          Saved. See you tomorrow.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="sticky bottom-24 flex h-14 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save today's log"}
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
