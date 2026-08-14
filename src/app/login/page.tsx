"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
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
    <AuthCardLayout title="Welcome back" description="Sign in to your account">
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
            className="h-12 rounded-xl border-white/80 bg-white/60 px-4 text-[15px] text-black focus-visible:border-[#008a62] focus-visible:bg-white/90 focus-visible:ring-[#008a62]/15"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-gray-800">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-[#008a62] transition-colors hover:text-[#006b4c] hover:underline"
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
            className="h-12 rounded-xl border-white/80 bg-white/60 px-4 text-[15px] text-black focus-visible:border-[#008a62] focus-visible:bg-white/90 focus-visible:ring-[#008a62]/15"
          />
        </div>
        <Button
          type="submit"
          className="mt-2 h-12 w-full rounded-xl bg-[#008a62] text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(0,138,98,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#006b4c] hover:shadow-[0_6px_16px_rgba(0,138,98,0.3)]"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#008a62] hover:text-[#006b4c] hover:underline"
        >
          Sign up
        </Link>
      </div>
    </AuthCardLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
