import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Medical Disclaimer — EczemaTrack",
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-[480px] px-5 py-8 space-y-6">
      <div className="space-y-1">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
          Back to Settings
        </Link>
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight">
          Medical Disclaimer
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Last updated: April 2026
        </p>
      </div>

      <div className="space-y-5 text-sm font-medium leading-relaxed text-foreground/80">
        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            EczemaTrack is not a medical device
          </h2>
          <p>
            EczemaTrack is a personal symptom-tracking tool designed to help you
            record and reflect on your daily experiences with eczema. It is not a
            medical device, and it is not intended to diagnose, treat, cure, or
            prevent any disease or medical condition.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Not a substitute for professional advice
          </h2>
          <p>
            Nothing in EczemaTrack — including AI-generated pattern summaries,
            trigger correlations, or skin status predictions — constitutes medical
            advice. All insights are generated from your own data and are intended
            solely to support conversations with your dermatologist or healthcare
            provider.
          </p>
          <p>
            Always consult a qualified medical professional before making any
            changes to your treatment plan, medications, or skincare routine.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            AI-generated content
          </h2>
          <p>
            EczemaTrack uses artificial intelligence to identify patterns in your
            logged data. These patterns are statistical observations, not clinical
            findings. They may be incomplete, inaccurate, or misleading. They
            should never be used to make treatment decisions without professional
            medical guidance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Emergency situations
          </h2>
          <p>
            If you are experiencing a severe allergic reaction, anaphylaxis, or
            any other medical emergency, call emergency services immediately.
            Do not rely on this app in an emergency.
          </p>
        </section>

        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-bold">
            This is not medical advice. Please consult your dermatologist for
            treatment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
