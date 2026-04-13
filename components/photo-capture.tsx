"use client";

import imageCompression from "browser-image-compression";
import { Camera, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

interface PhotoCaptureProps {
  photos: PendingPhoto[];
  onChange: (next: PendingPhoto[]) => void;
  max?: number;
}

export function PhotoCapture({ photos, onChange, max = 4 }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);

    try {
      const compressed: PendingPhoto[] = [];
      for (const file of Array.from(files)) {
        if (photos.length + compressed.length >= max) break;
        const out = await imageCompression(file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: "image/jpeg",
        });
        const jpegFile =
          out instanceof File
            ? out
            : new File([out], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
              });
        compressed.push({
          id: crypto.randomUUID(),
          file: jpegFile,
          previewUrl: URL.createObjectURL(jpegFile),
        });
      }
      onChange([...photos, ...compressed]);
    } catch {
      setError("Could not process that image. Try another.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(id: string) {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(photos.filter((p) => p.id !== id));
  }

  const atMax = photos.length >= max;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted"
          >
            <Image
              src={photo.previewUrl}
              alt="Captured photo"
              fill
              unoptimized
              sizes="120px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => remove(photo.id)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-transform active:scale-90"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}

        {!atMax && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
          >
            <Camera className="size-6" strokeWidth={2} />
            <span className="text-xs font-semibold">
              {busy ? "Processing…" : "Add photo"}
            </span>
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs font-medium text-destructive">{error}</p>
      )}
      {atMax && (
        <p className="text-xs font-medium text-muted-foreground">
          Max {max} photos per log
        </p>
      )}
    </div>
  );
}
