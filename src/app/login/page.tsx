"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { securePost } from "@/lib/secure-fetch";

type StatusBanner =
  | { type: "PENDING" }
  | { type: "REJECTED"; reason: string | null }
  | { type: "INACTIVE" };

interface PrecheckResponse {
  ok: boolean;
  error?: {
    code: string;
    reason?: string | null;
    message?: string;
  };
}

function StatusAlert({ banner }: { banner: StatusBanner }) {
  if (banner.type === "PENDING") {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Tài khoản của bạn đang chờ Admin xét duyệt. Vui lòng quay lại sau.
      </div>
    );
  }
  if (banner.type === "REJECTED") {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-semibold">Tài khoản của bạn chưa được phê duyệt!</p>
        {banner.reason && (
          <p className="mt-1">
            Lý do từ Admin: <span className="font-medium">{banner.reason}</span>
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      Tài khoản đã bị vô hiệu hoá. Liên hệ Admin để được hỗ trợ.
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<StatusBanner | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBanner(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // Step 1: precheck — validates credentials and user status
      const precheck = await securePost<PrecheckResponse>(
        "/api/login/precheck",
        { email, password },
        "", // no Turnstile on login; server has requireTurnstile: false
      );

      if (!precheck.ok) {
        const code = precheck.error?.code;
        if (code === "PENDING") {
          setBanner({ type: "PENDING" });
          return;
        }
        if (code === "REJECTED") {
          setBanner({ type: "REJECTED", reason: precheck.error?.reason ?? null });
          return;
        }
        if (code === "INACTIVE") {
          setBanner({ type: "INACTIVE" });
          return;
        }
        // INVALID_CREDENTIALS or other error
        toast.error("Invalid email or password");
        return;
      }

      // Step 2: signIn via NextAuth (account is ACTIVE)
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden p-5"
      style={{ background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)" }}
    >
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />

      <div className="auth-glass-card relative z-10 w-full max-w-105 bg-white/40 backdrop-blur-xl border border-white/50 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] px-8 py-10">
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome back</h2>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {banner && <StatusAlert banner={banner} />}
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-800">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-sm text-[#008a62] font-semibold hover:text-[#006b4c] hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-12 px-4 text-[15px] text-black bg-white/60 border-white/80 rounded-xl focus-visible:bg-white/90 focus-visible:border-[#008a62] focus-visible:ring-[#008a62]/15"
            />
          </div>
          <Button
            type="submit"
            className="w-full mt-2 h-12 text-[15px] text-white font-semibold rounded-xl bg-[#008a62] hover:bg-[#006b4c] shadow-[0_4px_12px_rgba(0,138,98,0.2)] hover:shadow-[0_6px_16px_rgba(0,138,98,0.3)] hover:-translate-y-0.5 transition-all"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-[#008a62] hover:text-[#006b4c] hover:underline font-semibold"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
