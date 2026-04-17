"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "./actions";

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  const confirmed = value === "DELETE";

  function handleDelete() {
    if (!confirmed) return;
    startTransition(async () => {
      await deleteAccount();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-destructive underline-offset-2 hover:underline"
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="space-y-1">
        <p className="text-sm font-bold text-destructive">This cannot be undone.</p>
        <p className="text-sm font-medium text-muted-foreground">
          All your logs, photos, and analyses will be permanently deleted. Type{" "}
          <span className="font-mono font-bold text-foreground">DELETE</span> to confirm.
        </p>
      </div>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type DELETE"
        className="h-11 rounded-2xl border-destructive/40 font-mono font-bold"
        autoFocus
      />
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={handleDelete}
          disabled={!confirmed || pending}
          className="h-11 flex-1 rounded-full bg-destructive text-sm font-bold text-destructive-foreground disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Delete account"}
        </Button>
        <button
          type="button"
          onClick={() => { setOpen(false); setValue(""); }}
          className="h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
