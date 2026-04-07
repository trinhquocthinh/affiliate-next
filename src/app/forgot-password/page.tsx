"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(data.error?.message || "Request failed");
      } else {
        if (data.data?.devResetUrl) setDevResetUrl(data.data.devResetUrl);
        setSubmitted(true);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const bgWrapper = (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden p-5"
      style={{ background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)" }}
    >
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-glass-card relative z-10 w-full max-w-105 bg-white/40 backdrop-blur-xl border border-white/50 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] px-8 py-10">
        {submitted ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            </div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm">
                If an account exists with that email, we&apos;ve sent a password reset link.
              </p>
            </div>
            {devResetUrl && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">DEV MODE — Reset link:</p>
                <a
                  href={devResetUrl}
                  className="text-xs text-[#008a62] break-all hover:underline"
                >
                  {devResetUrl}
                </a>
              </div>
            )}
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-white/50 bg-white/40 hover:bg-white/60 font-semibold"
              >
                Back to sign in
              </Button>
            </Link>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <Image
                src="/assets/logo.png"
                alt="Shop Quành"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Forgot password?</h2>
              <p className="text-gray-500 text-sm">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>
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
                  className="h-12 px-4 text-[15px] text-black bg-white/60 border-white/80 rounded-xl focus-visible:bg-white/90 focus-visible:border-[#008a62] focus-visible:ring-[#008a62]/15"
                />
              </div>
              <Button
                type="submit"
                className="w-full mt-2 h-12 text-[15px] text-white font-semibold rounded-xl bg-[#008a62] hover:bg-[#006b4c] shadow-[0_4px_12px_rgba(0,138,98,0.2)] hover:shadow-[0_6px_16px_rgba(0,138,98,0.3)] hover:-translate-y-0.5 transition-all"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-500">
              Remember your password?{" "}
              <Link
                href="/login"
                className="text-[#008a62] hover:text-[#006b4c] hover:underline font-semibold"
              >
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return bgWrapper;
}
