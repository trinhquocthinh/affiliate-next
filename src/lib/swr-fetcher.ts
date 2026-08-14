import { progressDone, progressStart } from "./progress-store";

export class FetchError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "FetchError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Standard fetch wrapper:
 * - participates in global in-flight progress counter
 * - returns parsed JSON (or null for 204)
 * - throws FetchError on non-2xx
 * - on 401: triggers a soft redirect to /login
 */
export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  progressStart();
  try {
    const res = await fetch(input, {
      credentials: "same-origin",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
    });

    if (res.status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
      throw new FetchError(401, "Unauthorized");
    }

    let body: unknown = null;
    if (res.status !== 204) {
      const text = await res.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
    }

    if (!res.ok) {
      const message =
        (body &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
          ? (body as { error: string }).error
          : typeof body === "string"
            ? body
            : res.statusText) || `Request failed (${res.status})`;
      throw new FetchError(res.status, message, body);
    }

    return body as T;
  } finally {
    progressDone();
  }
}

/** SWR fetcher: SWR passes the key (string | array). We support string-only keys (URLs). */
export const swrFetcher = <T = unknown>(key: string): Promise<T> => apiFetch<T>(key);
