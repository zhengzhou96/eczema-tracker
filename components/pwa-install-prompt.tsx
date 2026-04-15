"use client";

import { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-v1";

type PromptMode = "ios" | "native" | "hidden";

export function PwaInstallPrompt() {
  const [mode, setMode] = useState<PromptMode>("hidden");
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // queueMicrotask keeps setState out of the synchronous effect body,
    // satisfying the react-compiler lint rule while still running immediately.
    queueMicrotask(() => {
      if (localStorage.getItem(DISMISS_KEY)) return;

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true;
      if (standalone) return;

      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (ios) {
        setMode("ios");
        return;
      }

      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e as BeforeInstallPromptEvent;
        setMode("native");
      };

      window.addEventListener("beforeinstallprompt", handler);
      cleanupRef.current = () =>
        window.removeEventListener("beforeinstallprompt", handler);
    });

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setMode("hidden");
  };

  const install = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
    deferredPrompt.current = null;
    setMode("hidden");
  };

  if (mode === "hidden") return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-full max-w-[440px] -translate-x-1/2 px-4">
      <div
        className="rounded-[20px] bg-white p-4"
        style={{ boxShadow: "rgba(14,15,12,0.12) 0px 0px 0px 1px" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-black tracking-tight"
            style={{ background: "#9fe870", color: "#163300" }}
          >
            ET
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-[15px] font-semibold leading-snug"
              style={{ color: "#0e0f0c" }}
            >
              Add to Home Screen
            </p>
            <p
              className="mt-0.5 text-[13px] leading-snug"
              style={{ color: "#868685" }}
            >
              {mode === "ios" ? (
                <>
                  Tap <strong>Share</strong> then{" "}
                  <strong>Add to Home Screen</strong> for the full app
                  experience.
                </>
              ) : (
                "Install EczemaTrack for quick access — works offline, no browser chrome."
              )}
            </p>
          </div>

          <button
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 transition-colors hover:bg-black/5"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" style={{ color: "#868685" }} />
          </button>
        </div>

        {mode === "native" && (
          <button
            onClick={install}
            className="mt-3 w-full rounded-full py-2.5 text-[15px] font-semibold transition-transform active:scale-95 hover:scale-[1.02]"
            style={{ background: "#9fe870", color: "#163300" }}
          >
            Install App
          </button>
        )}
      </div>
    </div>
  );
}
