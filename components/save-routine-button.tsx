"use client";

import { Bookmark } from "lucide-react";
import { useState, useTransition } from "react";
import { saveRoutine, unsaveRoutine } from "@/lib/routines/actions";

export function SaveRoutineButton({
  routineId,
  initialSaved,
}: {
  routineId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      try {
        if (next) {
          await saveRoutine(routineId);
        } else {
          await unsaveRoutine(routineId);
        }
      } catch {
        setSaved(!next);
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      aria-label={saved ? "Unsave routine" : "Save routine"}
      className="flex size-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-[1.05] active:scale-95 disabled:opacity-50"
      style={{
        backgroundColor: saved ? "#9fe870" : "rgba(22,51,0,0.08)",
      }}
    >
      <Bookmark
        className="size-5"
        aria-hidden
        style={{ color: saved ? "#163300" : "#0e0f0c" }}
        fill={saved ? "#163300" : "none"}
      />
    </button>
  );
}
