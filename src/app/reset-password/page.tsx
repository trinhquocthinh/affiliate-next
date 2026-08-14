"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";

const glassPage = (children: React.ReactNode) => (
  <div
    className="relative flex min-h-screen items-center justify-center overflow-hidden p-5"
    style={{ background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)" }}
  >
    <div className="auth-blob auth-blob-1" />
    <div className="auth-blob auth-blob-2" />
    <div className="auth-glass-card relative z-10 w-full max-w-105 rounded-3xl border border-white/50 bg-white/40 px-8 py-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl">
      {children}
    </div>
  </div>
);

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (!token) {
    return glassPage(
      <>
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800">Invalid link</h2>
          <p className="text-sm text-gray-500">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl border-white/50 bg-white/40 font-semibold hover:bg-white/60"
          >
            Request a new link
          </Button>
        </Link>
      </>,
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(data.error?.message || "Reset failed");
      } else {
        toast.success("Password reset successfully!");
        router.push("/login");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return glassPage(
    <>
      <div className="mb-6 flex justify-center">
        <Image
          src="/assets/logo.png"
          alt="Shop Quành"
          width={80}
          height={80}
          className="object-contain"
        />
      </div>

      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-800">Reset password</h2>
        <p className="text-sm text-gray-500">Enter your new password below.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-sm font-semibold text-gray-800">
            New password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-white/80 bg-white/60 px-4 text-[15px] focus-visible:border-[#008a62] focus-visible:bg-white/90 focus-visible:ring-[#008a62]/15"
          />
          <PasswordStrengthMeter password={password} />
          <p className="text-xs text-gray-500">
            Min 8 chars, 1 uppercase, 1 number, 1 special character
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-800">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 rounded-xl border-white/80 bg-white/60 px-4 text-[15px] focus-visible:border-[#008a62] focus-visible:bg-white/90 focus-visible:ring-[#008a62]/15"
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-red-500">Passwords do not match</p>
          )}
        </div>
        <Button
          type="submit"
          className="mt-2 h-12 w-full rounded-xl bg-[#008a62] text-[15px] font-semibold shadow-[0_4px_12px_rgba(0,138,98,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#006b4c] hover:shadow-[0_6px_16px_rgba(0,138,98,0.3)]"
          disabled={loading}
        >
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        <Link
          href="/login"
          className="font-semibold text-[#008a62] hover:text-[#006b4c] hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </>,
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
