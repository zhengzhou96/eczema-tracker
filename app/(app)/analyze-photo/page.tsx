import { ChevronLeft, ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyzePhotoButton } from "@/components/analyze-photo-button";
import { createClient } from "@/lib/supabase/server";

const AREA_LABELS: Record<string, string> = {
  face: "Face",
  neck: "Neck",
  chest: "Chest",
  back: "Back",
  arms: "Arms",
  hands: "Hands",
  abdomen: "Abdomen",
  legs: "Legs",
  feet: "Feet",
};

function formatLogDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

type PhotoRow = {
  id: string;
  storage_path: string;
  body_area: string | null;
  created_at: string;
  daily_logs:
    | { log_date: string; user_id: string }
    | { log_date: string; user_id: string }[];
};

export default async function AnalyzePhotoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const since = new Date();
  since.setDate(since.getDate() - 29);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("photos")
    .select(
      "id, storage_path, body_area, created_at, daily_logs!inner(log_date, user_id)",
    )
    .gte("daily_logs.log_date", sinceIso)
    .order("created_at", { ascending: false })
    .limit(20);

  const photos = (rows ?? []) as PhotoRow[];

  const photosWithUrls = await Promise.all(
    photos.map(async (p) => {
      const logDate = Array.isArray(p.daily_logs)
        ? (p.daily_logs[0]?.log_date ?? "")
        : p.daily_logs.log_date;
      const { data: signed } = await supabase.storage
        .from("photos")
        .createSignedUrl(p.storage_path, 3600);
      return {
        id: p.id,
        signedUrl: signed?.signedUrl ?? null,
        bodyArea: p.body_area,
        logDate,
      };
    }),
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href="/analyses"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
          Back to analyses
        </Link>
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Photo observation
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Select a photo. Claude will describe what it sees — purely
          observational, no diagnosis. 1 observation per day.
        </p>
      </div>

      {photosWithUrls.length === 0 ? (
        <div className="space-y-2 rounded-3xl border border-dashed border-border p-8 text-center">
          <ImageOff className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-semibold text-foreground">No photos yet.</p>
          <p className="text-sm font-medium text-muted-foreground">
            Add photos when logging a day — tap the camera icon on the log
            page.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {photosWithUrls.map((p) => (
            <li
              key={p.id}
              className="space-y-4 rounded-3xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                {p.signedUrl ? (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={p.signedUrl}
                      alt={
                        p.bodyArea
                          ? `Photo of ${AREA_LABELS[p.bodyArea] ?? p.bodyArea}`
                          : "Skin photo"
                      }
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ) : (
                  <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-muted">
                    <ImageOff
                      className="size-6 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-tight">
                    {p.bodyArea
                      ? (AREA_LABELS[p.bodyArea] ?? p.bodyArea)
                      : "Skin photo"}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {formatLogDate(p.logDate)}
                  </p>
                </div>
              </div>
              <AnalyzePhotoButton photoId={p.id} />
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
