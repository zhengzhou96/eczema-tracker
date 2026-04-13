"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/login`,
      },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="w-full space-y-6 text-center">
        <h1 className="text-3xl font-black leading-[0.9] tracking-tight">
          Check your email
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          If an account exists for{" "}
          <span className="font-semibold text-foreground">{email}</span>, we
          sent a password reset link.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-black leading-[0.9] tracking-tight text-foreground">
          Reset password
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          We&apos;ll email you a secure link.
        </p>
      </div>

      <Card size="default" className="rounded-3xl p-6">
        <CardHeader className="px-0 pb-2">
          <CardTitle className="text-2xl font-semibold">
            Forgot password
          </CardTitle>
          <CardDescription>
            Enter the email you signed up with.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl text-base"
                disabled={loading}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground transition-transform hover:scale-[1.02] hover:bg-primary active:scale-[0.98]"
            >
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm font-medium text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-semibold text-foreground underline underline-offset-4"
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
