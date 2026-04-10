import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit: 5 requests per 15 minutes per IP
    const ip = getClientIp(request);
    const limit = rateLimit(ip, { limit: 5, windowSecs: 15 * 60 });
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) } },
      );
    }

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const genericResponse = NextResponse.json({
      ok: true,
      data: { message: "If this email exists, we sent a reset link" },
    });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return genericResponse;

    // Block admin account from using password reset
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email === adminEmail) return genericResponse;

    // Rate limit: max 3 reset tokens per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokens = await prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: oneHourAgo } },
    });

    if (recentTokens >= 3) return genericResponse;

    // Generate token
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    // TODO: Send email with reset link containing rawToken
    // In development, expose the reset URL in the response body only (not logs).
    // In production this field is omitted — the user receives an email instead.
    if (process.env.NODE_ENV === "development") {
      const resetUrl = `${process.env.AUTH_URL}/reset-password?token=${rawToken}`;
      return NextResponse.json({
        ok: true,
        data: { message: "If this email exists, we sent a reset link", devResetUrl: resetUrl },
      });
    }

    return genericResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Request failed" } },
      { status: 500 },
    );
  }
}
