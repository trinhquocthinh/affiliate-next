"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { useTurnstile } from "@/components/auth/use-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { securePost } from "@/lib/secure-fetch";

interface RegisterResponse {
  ok: boolean;
  error?: { code: string; message: string };
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const { turnstileToken, setTurnstileToken, turnstileRef, resetTurnstile, ensureToken } =
    useTurnstile();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ensureToken()) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      displayName: formData.get("displayName") as string,
    };

    try {
      const data = await securePost<RegisterResponse>("/api/register", body, turnstileToken);

      if (!data.ok) {
        toast.error(data.error?.message || "Registration failed");
        resetTurnstile();
      } else {
        setPending(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <AuthCardLayout title="Đăng ký thành công!" description="Tài khoản đang chờ duyệt">
        <div className="flex flex-col items-center text-center">
          <p className="mb-4 text-sm text-gray-600">
            Tài khoản của bạn đã được tạo và đang chờ Admin duyệt. Chúng tôi sẽ thông báo khi có kết
            quả.
          </p>
          <Link
            href="/login"
            className="mt-2 text-sm font-semibold text-[#008a62] hover:text-[#006b4c] hover:underline"
          >
            Quay lại trang đăng nhập
          </Link>
        </div>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout title="Create account" description="Get started with Shop Quành">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="displayName" className="text-sm font-semibold text-gray-800">
            Display name
          </Label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="Your name"
            required
            autoFocus
            className="h-12 rounded-xl border-white/80 bg-white/60 px-4 text-[15px] text-black focus-visible:border-[#008a62] focus-visible:bg-white/90 focus-visible:ring-[#008a62]/15"
          />
        </div>
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
            className="h-12 rounded-xl border-white/80 bg-white/60 px-4 text-[15px] text-black focus-visible:border-[#008a62] focus-visible:bg-white/90 focus-visible:ring-[#008a62]/15"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-sm font-semibold text-gray-800">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-white/80 bg-white/60 px-4 text-[15px] text-black focus-visible:border-[#008a62] focus-visible:bg-white/90 focus-visible:ring-[#008a62]/15"
          />
          <PasswordStrengthMeter password={password} />
          <p className="text-xs text-gray-500">
            Min 8 chars, 1 uppercase, 1 number, 1 special character
          </p>
        </div>
        <TurnstileWidget ref={turnstileRef} onTokenChange={setTurnstileToken} />
        <Button
          type="submit"
          className="mt-2 h-12 w-full rounded-xl bg-[#008a62] text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(0,138,98,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#006b4c] hover:shadow-[0_6px_16px_rgba(0,138,98,0.3)]"
          disabled={loading || !turnstileToken}
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
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
