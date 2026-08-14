import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { checkRequestRateLimit } from "@/lib/api-utils";
import { verifyRequestSecurity } from "@/lib/security-guard";
import { logAuditEvent } from "@/lib/audit";
import { getDiscordConfig, sendChannelMessage, buildPendingUserEmbed } from "@/lib/discord";

// firebase-admin requires the Node.js runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Rate limit: 10 registrations per hour per IP
    const rateLimitRes = checkRequestRateLimit(request, { limit: 10, windowSecs: 60 * 60 });
    if (rateLimitRes) return rateLimitRes;

    // Triple-layer security: SHA-256 body checksum + Firebase App Check + Turnstile.
    const guard = await verifyRequestSecurity(request);
    if (!guard.ok) return guard.response;

    const parsed = registerSchema.safeParse(guard.body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { email, password, displayName } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "An account with this email already exists" },
        },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role: "BUYER",
        status: "PENDING",
      },
    });

    // Notify admin Discord channel — failure must not block registration
    try {
      const { adminChannelId } = getDiscordConfig();
      await sendChannelMessage(adminChannelId, {
        embeds: [buildPendingUserEmbed(user)],
      });
    } catch (discordErr) {
      console.error("Failed to send Discord pending alert:", discordErr);
    }

    await logAuditEvent({
      actorId: user.id,
      targetUserId: user.id,
      action: "REGISTER_PENDING",
      newValue: { email: user.email, displayName: user.displayName },
      source: "register_api",
    });

    return NextResponse.json(
      { ok: true, data: { userId: user.id, email: user.email, status: "PENDING" } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Registration failed" } },
      { status: 500 },
    );
  }
}
