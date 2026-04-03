"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      displayName: formData.get("displayName") as string,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(data.error?.message || "Registration failed");
      } else {
        toast.success("Account created! Please sign in.");
        router.push("/login");
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
            alt="Affiliate Manager"
            width={80}
            height={80}
            className="object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Create account</h2>
          <p className="text-gray-500 text-sm">Get started with Affiliate Manager</p>
        </div>

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
              className="h-12 px-4 text-[15px] bg-white/60 border-white/80 rounded-xl focus-visible:bg-white/90 focus-visible:border-[#008a62] focus-visible:ring-[#008a62]/15"
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
              className="h-12 px-4 text-[15px] bg-white/60 border-white/80 rounded-xl focus-visible:bg-white/90 focus-visible:border-[#008a62] focus-visible:ring-[#008a62]/15"
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
          <Button
            type="submit"
            className="w-full mt-2 h-12 text-[15px] font-semibold rounded-xl bg-[#008a62] hover:bg-[#006b4c] shadow-[0_4px_12px_rgba(0,138,98,0.2)] hover:shadow-[0_6px_16px_rgba(0,138,98,0.3)] hover:-translate-y-0.5 transition-all"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[#008a62] hover:text-[#006b4c] hover:underline font-semibold"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
