import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { getFirebaseAppCheck } from "@/lib/firebase-admin";
import { getClientIp } from "@/lib/rate-limit";

/**
 * Triple-layer request security guard for sensitive POST endpoints.
 *
 * Verifies, in order:
 *   1. SHA-256 body checksum   (`X-Body-Checksum` header, lowercase hex)
 *   2. Firebase App Check      (`X-Firebase-AppCheck` header)
 *   3. Cloudflare Turnstile    (`X-Turnstile-Token` header OR `turnstileToken`
 *                                body field)
 *
 * The raw body is read exactly once (`request.text()`) so the checksum is
 * computed over the exact bytes that get parsed. The parsed JSON is returned
 * to the caller, which MUST use it instead of calling `request.json()` again
 * (the underlying stream is already consumed).
 *
 * Usage:
 *   export const runtime = "nodejs";
 *
 *   export async function POST(request: Request) {
 *     const guard = await verifyRequestSecurity<MyBodyShape>(request);
 *     if (!guard.ok) return guard.response;
 *     const body = guard.body; // already JSON-parsed, untyped — validate with Zod next
 *     ...
 *   }
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface VerifyOptions {
  /**
   * If false, skip Turnstile verification (e.g. for purely server-to-server
   * routes). Defaults to true.
   */
  requireTurnstile?: boolean;
}

export type GuardResult<T> =
  | { ok: true; body: T; rawBody: string }
  | { ok: false; response: NextResponse };

type ErrorCode =
  | "BAD_REQUEST"
  | "CHECKSUM_MISMATCH"
  | "APPCHECK_INVALID"
  | "TURNSTILE_INVALID"
  | "SECURITY_CHECK_FAILED";

function fail(
  status: 400 | 401 | 500,
  code: ErrorCode,
  message: string,
): { ok: false; response: NextResponse } {
  return {
    ok: false,
    response: NextResponse.json({ ok: false, error: { code, message } }, { status }),
  };
}

/** Constant-time comparison of two lowercase hex strings of equal length. */
function safeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function verifyChecksum(rawBody: string, headerHex: string): boolean {
  const expected = createHash("sha256").update(rawBody, "utf8").digest("hex");
  return safeHexEqual(expected, headerHex.toLowerCase());
}

async function verifyAppCheck(token: string): Promise<boolean> {
  try {
    await getFirebaseAppCheck().verifyToken(token);
    return true;
  } catch (err) {
    console.warn("[security-guard] App Check verification failed", err);
    return false;
  }
}

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  hostname?: string;
  action?: string;
}

async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[security-guard] TURNSTILE_SECRET_KEY is not configured");
    return false;
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp && remoteIp !== "unknown") form.set("remoteip", remoteIp);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      // Avoid Next.js fetch caching for this verification call.
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[security-guard] Turnstile siteverify HTTP error", res.status);
      return false;
    }
    const data = (await res.json()) as TurnstileResponse;
    if (!data.success) {
      console.warn("[security-guard] Turnstile rejected token", data["error-codes"]);
    }
    return data.success === true;
  } catch (err) {
    console.error("[security-guard] Turnstile siteverify call failed", err);
    return false;
  }
}

export async function verifyRequestSecurity<T = unknown>(
  request: Request,
  opts: VerifyOptions = {},
): Promise<GuardResult<T>> {
  const requireTurnstile = opts.requireTurnstile ?? true;

  // Optional dev-only bypass — never honored in production.
  if (process.env.NODE_ENV !== "production" && process.env.SECURITY_GUARD_DISABLED === "1") {
    try {
      const rawBody = await request.text();
      const body = (rawBody ? JSON.parse(rawBody) : {}) as T;
      return { ok: true, body, rawBody };
    } catch {
      return fail(400, "BAD_REQUEST", "Invalid JSON body");
    }
  }

  // 0. Read the raw body once.
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return fail(400, "BAD_REQUEST", "Unable to read request body");
  }

  // 1. SHA-256 body checksum.
  const checksumHeader = request.headers.get("x-body-checksum");
  if (!checksumHeader) {
    return fail(400, "BAD_REQUEST", "Missing X-Body-Checksum header");
  }
  if (!/^[a-f0-9]{64}$/i.test(checksumHeader)) {
    return fail(400, "BAD_REQUEST", "Malformed X-Body-Checksum header");
  }
  if (!verifyChecksum(rawBody, checksumHeader)) {
    return fail(400, "CHECKSUM_MISMATCH", "Request body checksum mismatch");
  }

  // 2. Firebase App Check.
  // Skip verification on Preview/UAT when SKIP_APPCHECK=1 — the dynamically
  // generated Vercel preview domain cannot be registered in reCAPTCHA.
  const skipAppCheck = process.env.SKIP_APPCHECK === "1";
  if (!skipAppCheck) {
    const appCheckToken = request.headers.get("x-firebase-appcheck");
    if (!appCheckToken) {
      return fail(401, "APPCHECK_INVALID", "Missing App Check token");
    }
    try {
      const ok = await verifyAppCheck(appCheckToken);
      if (!ok) return fail(401, "APPCHECK_INVALID", "Invalid App Check token");
    } catch (err) {
      console.error("[security-guard] App Check unexpected error", err);
      return fail(500, "SECURITY_CHECK_FAILED", "Security check failed");
    }
  }

  // 3. Cloudflare Turnstile.
  if (requireTurnstile) {
    let turnstileToken = request.headers.get("x-turnstile-token") ?? "";
    if (!turnstileToken && rawBody) {
      // Fallback: read from body field without consuming the stream.
      try {
        const peek = JSON.parse(rawBody) as { turnstileToken?: unknown };
        if (typeof peek.turnstileToken === "string") {
          turnstileToken = peek.turnstileToken;
        }
      } catch {
        // Will be reported by the JSON.parse below.
      }
    }
    if (!turnstileToken) {
      return fail(401, "TURNSTILE_INVALID", "Missing Turnstile token");
    }
    try {
      const ok = await verifyTurnstile(turnstileToken, getClientIp(request));
      if (!ok) {
        return fail(401, "TURNSTILE_INVALID", "Invalid Turnstile token");
      }
    } catch (err) {
      console.error("[security-guard] Turnstile unexpected error", err);
      return fail(500, "SECURITY_CHECK_FAILED", "Security check failed");
    }
  }

  // 4. Parse JSON for the caller (stream is already consumed).
  let body: T;
  try {
    body = (rawBody ? JSON.parse(rawBody) : {}) as T;
  } catch {
    return fail(400, "BAD_REQUEST", "Invalid JSON body");
  }

  return { ok: true, body, rawBody };
}
