import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
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
    // For now, log the token in dev mode
    if (process.env.NODE_ENV === "development") {
      const resetUrl = `${process.env.AUTH_URL}/reset-password?token=${rawToken}`;
      console.log(`[DEV] Password reset token for ${email}: ${rawToken}`);
      console.log(`[DEV] Reset URL: ${resetUrl}`);
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
