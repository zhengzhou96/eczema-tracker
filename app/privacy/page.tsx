import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — EczemaTrack",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Last updated: April 2026
        </p>
      </div>

      <div className="space-y-5 text-sm font-medium leading-relaxed text-foreground/80">
        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            What we collect
          </h2>
          <p>
            EczemaTrack collects only the data you choose to enter: daily symptom
            logs (itch level, stress, sleep, skin status), food diary entries,
            photos of affected areas, and basic profile information (name, age
            range, skin type, known triggers).
          </p>
          <p>
            We also collect your email address, used solely for authentication.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            How we store it
          </h2>
          <p>
            Your data is stored in a Supabase (PostgreSQL) database with
            row-level security — only you can read or write your own records.
            Photos are stored in a private Supabase Storage bucket accessible
            only to you.
          </p>
          <p>
            Data is stored on servers in the European Union region. Supabase is
            SOC 2 Type II compliant.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            AI processing
          </h2>
          <p>
            When you request AI analysis, a summary of your recent logs is sent
            to Anthropic&apos;s Claude API for processing. This summary contains
            only aggregated numbers — not your photos or free-text notes unless
            you explicitly share them. Anthropic&apos;s data processing agreement
            applies. We do not use your data to train AI models.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Who we share data with
          </h2>
          <p>
            We do not sell your data. We do not share your health data with
            advertisers, insurers, or employers. The only third parties who
            process your data are:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Supabase (infrastructure and auth)</li>
            <li>Anthropic (AI analysis, when you request it)</li>
            <li>Vercel (hosting and edge network)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Your rights
          </h2>
          <p>
            You can export all your data as a CSV file from Settings at any time.
            You can delete your account and all associated data permanently from
            the Settings page. After deletion, no copies of your data are retained
            except where required by law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Cookies and analytics
          </h2>
          <p>
            EczemaTrack uses authentication cookies (necessary for login) and no
            third-party tracking or analytics cookies. We do not use Google
            Analytics or any advertising pixels.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-foreground">
            Contact
          </h2>
          <p>
            For privacy questions or data requests, contact us at the email
            address registered with your account.
          </p>
        </section>
      </div>
    </div>
  );
}
