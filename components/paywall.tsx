import Link from "next/link";

interface PaywallProps {
  feature: string;
  description?: string;
}

export function Paywall({ feature, description }: PaywallProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 text-center">
      <div className="text-2xl mb-2">🔒</div>
      <p className="font-bold text-sm mb-1">{feature}</p>
      {description && (
        <p className="text-xs text-muted-foreground mb-4">{description}</p>
      )}
      <Link
        href="/upgrade"
        className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
