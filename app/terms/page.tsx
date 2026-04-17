import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service — EczemaTrack",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Last updated: April 2026
        </p>
      </div>

      <div className="space-y-5 text-sm font-medium leading-relaxed text-foreground/80">
        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Acceptance
          </h2>
          <p>
            By creating an account and using EczemaTrack, you agree to these
            terms. If you do not agree, do not use the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            What EczemaTrack is
          </h2>
          <p>
            EczemaTrack is a personal health-tracking journal. It is a &quot;better
            notebook&quot; — a tool for recording your own observations. It is not a
            clinical tool and makes no medical guarantees. See our{" "}
            <Link href="/disclaimer" className="underline underline-offset-2">
              Medical Disclaimer
            </Link>{" "}
            for full details.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Your account
          </h2>
          <p>
            You are responsible for maintaining the security of your account
            credentials. You must be at least 13 years old to use EczemaTrack
            (or have parental consent if under 18). You may not create accounts
            on behalf of others without their explicit consent.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Acceptable use
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use EczemaTrack to make or act on medical decisions without consulting a doctor</li>
            <li>Upload content that is illegal, harmful, or violates others&apos; rights</li>
            <li>Attempt to access other users&apos; data or circumvent security measures</li>
            <li>Use the service for any commercial purpose without permission</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Your data
          </h2>
          <p>
            You own your data. We do not claim any rights to the health
            information you enter. You can export or delete it at any time from
            Settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Service availability
          </h2>
          <p>
            EczemaTrack is provided &quot;as is.&quot; We do not guarantee uptime,
            availability, or accuracy of AI-generated insights. We may modify or
            discontinue features at any time. For a critical medical need, always
            maintain your own records.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Limitation of liability
          </h2>
          <p>
            To the maximum extent permitted by law, EczemaTrack is not liable
            for any harm resulting from your use of or reliance on the app,
            including any health-related decisions made based on app content.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Changes to these terms
          </h2>
          <p>
            We may update these terms. Continued use of the app after changes
            constitutes acceptance of the new terms. We will notify you of
            material changes by email.
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
