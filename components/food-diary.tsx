"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";

export interface FoodItem {
  name: string;
}

interface FoodDiaryProps {
  items: FoodItem[];
  onChange: (next: FoodItem[]) => void;
}

const QUICK_PICKS = ["Dairy", "Gluten", "Eggs", "Nuts", "Sugar", "Alcohol"];

export function FoodDiary({ items, onChange }: FoodDiaryProps) {
  const [draft, setDraft] = useState("");

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange([...items, { name: trimmed }]);
    setDraft("");
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add a food (e.g. coffee)"
          className="h-11 flex-1 rounded-xl text-base"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          aria-label="Add food"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95"
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick}
            type="button"
            onClick={() => add(pick)}
            className="rounded-full border border-dashed border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            + {pick}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li
              key={`${item.name}-${idx}`}
              className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2"
            >
              <span className="text-sm font-medium text-foreground">
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label={`Remove ${item.name}`}
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
