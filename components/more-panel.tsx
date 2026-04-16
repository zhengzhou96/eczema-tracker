"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Calendar, Cpu, MoreHorizontal, Trophy, User, Zap } from "lucide-react";

const MORE_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, caption: "Trends & charts" },
  { href: "/you", label: "You", icon: User, caption: "Profile & streaks" },
  { href: "/calendar", label: "Calendar", icon: Calendar, caption: "Monthly view" },
  { href: "/milestones", label: "Milestones", icon: Trophy, caption: "Achievements" },
  { href: "/routines", label: "Routines", icon: Zap, caption: "Skincare routines" },
  { href: "/analyses", label: "AI Analysis", icon: Cpu, caption: "Deep analysis" },
] as const;

export function MoreButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="More"
        className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <MoreHorizontal className="size-5" aria-hidden />
        <span>More</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[480px] mx-auto rounded-t-3xl bg-background border border-border pb-[env(safe-area-inset-bottom)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <div className="px-5 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground py-3">
                More
              </h2>
              <div className="flex flex-col gap-1">
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-accent transition-colors"
                  >
                    <link.icon className="size-5 text-muted-foreground shrink-0" aria-hidden />
                    <div>
                      <div className="text-sm font-semibold">{link.label}</div>
                      <div className="text-xs text-muted-foreground">{link.caption}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
