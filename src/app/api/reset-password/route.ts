import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired reset token" } },
        { status: 400 },
      );
    }

    // Block admin account from using password reset
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && resetToken.user.email === adminEmail) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin account cannot use password reset" } },
        { status: 403 },
      );
    }

    const passwordHash = await hash(password, 12);

    // Update password and invalidate all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          loginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // Delete all sessions for this user (force re-login)
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
      // Delete all reset tokens for this user (one-time use)
      prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { message: "Password reset successfully. Please log in." },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Request failed" } },
      { status: 500 },
    );
  }
}
