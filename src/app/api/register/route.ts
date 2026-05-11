import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyRequestSecurity } from "@/lib/security-guard";

// firebase-admin requires the Node.js runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Rate limit: 10 registrations per hour per IP
    const ip = getClientIp(request);
    const limit = rateLimit(ip, { limit: 10, windowSecs: 60 * 60 });
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) } },
      );
    }

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
        { ok: false, error: { code: "VALIDATION_ERROR", message: "An account with this email already exists" } },
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
      },
    });

    return NextResponse.json(
      { ok: true, data: { userId: user.id, email: user.email } },
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
