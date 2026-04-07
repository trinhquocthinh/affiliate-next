"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function getPasswordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[Math.min(score, labels.length) - 1] || "Very weak" };
}

const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-400", "bg-emerald-500"];

const glassPage = (children: React.ReactNode) => (
  <div
    className="relative min-h-screen flex items-center justify-center overflow-hidden p-5"
    style={{ background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)" }}
  >
    <div className="auth-blob auth-blob-1" />
    <div className="auth-blob auth-blob-2" />
    <div className="auth-glass-card relative z-10 w-full max-w-105 bg-white/40 backdrop-blur-xl border border-white/50 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] px-8 py-10">
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
  const strength = getPasswordStrength(password);

  if (!token) {
    return glassPage(
      <>
        <div className="flex justify-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
        </div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid link</h2>
          <p className="text-gray-500 text-sm">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-white/50 bg-white/40 hover:bg-white/60 font-semibold"
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Reset password</h2>
        <p className="text-gray-500 text-sm">Enter your new password below.</p>
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
            className="h-12 px-4 text-[15px] bg-white/60 border-white/80 rounded-xl focus-visible:bg-white/90 focus-visible:border-[#008a62] focus-visible:ring-[#008a62]/15"
          />
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < strength.score ? strengthColors[strength.score - 1] : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">{strength.label}</p>
            </div>
          )}
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
            className="h-12 px-4 text-[15px] bg-white/60 border-white/80 rounded-xl focus-visible:bg-white/90 focus-visible:border-[#008a62] focus-visible:ring-[#008a62]/15"
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-red-500">Passwords do not match</p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full mt-2 h-12 text-[15px] font-semibold rounded-xl bg-[#008a62] hover:bg-[#006b4c] shadow-[0_4px_12px_rgba(0,138,98,0.2)] hover:shadow-[0_6px_16px_rgba(0,138,98,0.3)] hover:-translate-y-0.5 transition-all"
          disabled={loading}
        >
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        <Link
          href="/login"
          className="text-[#008a62] hover:text-[#006b4c] hover:underline font-semibold"
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
