"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreButton } from "./more-panel";

const leftTabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/history", label: "History", icon: History },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const logActive = pathname === "/log" || pathname.startsWith("/log/");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="relative mx-auto flex w-full max-w-[480px] items-stretch justify-between px-2 py-2">
        <div className="flex flex-1 items-stretch justify-around gap-1">
          {leftTabs.map((tab) => (
            <NavTab key={tab.href} pathname={pathname} {...tab} />
          ))}
        </div>

        <div className="w-20" aria-hidden />

        <div className="flex flex-1 items-stretch justify-around gap-1">
          <MoreButton />
        </div>

        <Link
          href="/log"
          aria-label="Log today"
          aria-current={logActive ? "page" : undefined}
          className={cn(
            "absolute left-1/2 top-0 flex size-14 -translate-x-1/2 -translate-y-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-[1.05] active:scale-95",
            logActive && "ring-4 ring-primary/30",
          )}
        >
          <Plus className="size-6" strokeWidth={3} aria-hidden />
        </Link>
      </div>
    </nav>
  );
}

function NavTab({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
