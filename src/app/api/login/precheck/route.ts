import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { checkRequestRateLimit } from "@/lib/api-utils";
import { verifyRequestSecurity } from "@/lib/security-guard";

export const runtime = "nodejs";

/**
 * POST /api/login/precheck
 *
 * Validates credentials and user status before calling NextAuth signIn.
 * Returns:
 *   200 { ok: true }                                       — ACTIVE, proceed to signIn
 *   401 { ok: false, error: { code: "INVALID_CREDENTIALS" } } — wrong email/password
 *   403 { ok: false, error: { code: "PENDING" } }             — awaiting approval
 *   403 { ok: false, error: { code: "REJECTED", reason } }    — rejected by admin
 *   403 { ok: false, error: { code: "INACTIVE" } }            — deactivated
 *
 * Password is always checked before returning a status-specific error to
 * prevent status-enumeration of pending/rejected accounts.
 */
export async function POST(request: Request) {
  // Rate limit: 5 attempts/min/IP
  const rateLimitRes = checkRequestRateLimit(request, { limit: 5, windowSecs: 60 });
  if (rateLimitRes) return rateLimitRes;

  const guard = await verifyRequestSecurity(request, { requireTurnstile: false });
  if (!guard.ok) return guard.response;

  const parsed = loginSchema.safeParse(guard.body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Validate password first — do NOT leak status before authentication
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
      { status: 401 },
    );
  }

  const passwordOk = await compare(password, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
      { status: 401 },
    );
  }

  // Password is correct — now check account status
  if (user.status === "PENDING") {
    return NextResponse.json({ ok: false, error: { code: "PENDING" } }, { status: 403 });
  }

  if (user.status === "REJECTED") {
    return NextResponse.json(
      { ok: false, error: { code: "REJECTED", reason: user.rejectReason } },
      { status: 403 },
    );
  }

  if (user.status === "INACTIVE") {
    return NextResponse.json({ ok: false, error: { code: "INACTIVE" } }, { status: 403 });
  }

  // ACTIVE — allow client to proceed with NextAuth signIn
  return NextResponse.json({ ok: true }, { status: 200 });
}
