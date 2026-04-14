"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/home");
      router.refresh();
      return;
    }

    setNeedsConfirmation(true);
    setLoading(false);
  }

  if (needsConfirmation) {
    return (
      <div className="w-full space-y-6 text-center">
        <h1 className="text-3xl font-black leading-[0.9] tracking-tight">
          Check your email
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="font-semibold text-foreground">{email}</span>.
          Open it on this device to finish signing up.
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
          Start tracking
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          Free. Private. Sixty seconds a day.
        </p>
      </div>

      <Card size="default" className="rounded-3xl p-6">
        <CardHeader className="px-0 pb-2">
          <CardTitle className="text-2xl font-semibold">
            Create account
          </CardTitle>
          <CardDescription>
            Your data stays yours. Export or delete any time.
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl text-base"
                disabled={loading}
              />
              <p className="text-xs font-medium text-muted-foreground">
                At least 8 characters.
              </p>
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
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm font-medium text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-foreground underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
