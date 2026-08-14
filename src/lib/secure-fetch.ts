"use client";

import { getAppCheckToken } from "@/lib/firebase-client";

/**
 * POST a JSON body to a protected endpoint with the three security headers
 * required by the server-side `verifyRequestSecurity` guard:
 *
 *   - X-Body-Checksum    : SHA-256 hex of the exact bytes sent in the body.
 *   - X-Firebase-AppCheck: App Check token from `firebase/app-check`.
 *   - X-Turnstile-Token  : Cloudflare Turnstile token from the widget.
 *
 * The body is serialized exactly once so the checksum the server computes
 * will match the bytes the server parses.
 */
export async function securePost<TResponse = unknown>(
  url: string,
  payload: unknown,
  turnstileToken: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const rawBody = JSON.stringify(payload ?? {});
  const [appCheckToken, checksum] = await Promise.all([getAppCheckToken(), sha256Hex(rawBody)]);

  const res = await fetch(url, {
    ...init,
    method: "POST",
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      "X-Body-Checksum": checksum,
      "X-Firebase-AppCheck": appCheckToken,
      "X-Turnstile-Token": turnstileToken,
    },
    body: rawBody,
  });

  return (await res.json()) as TResponse;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
