"use client";

import { useState } from "react";
import Link from "next/link";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { useTurnstile } from "@/components/auth/use-turnstile";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { securePost } from "@/lib/secure-fetch";

interface ForgotPasswordResponse {
  ok: boolean;
  data?: { devResetUrl?: string };
  error?: { code: string; message: string };
}

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const { turnstileToken, setTurnstileToken, turnstileRef, resetTurnstile, ensureToken } =
    useTurnstile();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ensureToken()) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const data = await securePost<ForgotPasswordResponse>(
        "/api/forgot-password",
        { email },
        turnstileToken,
      );

      if (!data.ok) {
        toast.error(data.error?.message || "Request failed");
        resetTurnstile();
      } else {
        if (data.data?.devResetUrl) setDevResetUrl(data.data.devResetUrl);
        setSubmitted(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthCardLayout
        title="Check your email"
        description="If an account exists with that email, we've sent a password reset link."
      >
        {devResetUrl && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold text-amber-700">DEV MODE — Reset link:</p>
            <a href={devResetUrl} className="text-xs break-all text-[#008a62] hover:underline">
              {devResetUrl}
            </a>
          </div>
        )}
        <Link href="/login">
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl border-white/50 bg-white/40 font-semibold hover:bg-white/60"
          >
            Back to sign in
          </Button>
        </Link>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title="Forgot password?"
      description="Enter your email and we'll send you a reset link."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-sm font-semibold text-gray-800">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
            className="h-12 rounded-xl border-white/80 bg-white/60 px-4 text-[15px] text-black focus-visible:border-[#008a62] focus-visible:bg-white/90 focus-visible:ring-[#008a62]/15"
          />
        </div>
        <TurnstileWidget ref={turnstileRef} onTokenChange={setTurnstileToken} />
        <Button
          type="submit"
          className="mt-2 h-12 w-full rounded-xl bg-[#008a62] text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(0,138,98,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#006b4c] hover:shadow-[0_6px_16px_rgba(0,138,98,0.3)]"
          disabled={loading || !turnstileToken}
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      <div className="mt-6 text-center text-sm text-gray-500">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#008a62] hover:text-[#006b4c] hover:underline"
        >
          Sign in
        </Link>
      </div>
    </AuthCardLayout>
  );
}
