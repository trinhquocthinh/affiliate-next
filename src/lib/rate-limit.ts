/**
 * Simple in-memory sliding window rate limiter.
 *
 * NOTE: This is per-instance (per Netlify function container). It will not
 * enforce limits across multiple concurrent function instances. For a
 * distributed rate limiter, replace the store with Redis/Upstash.
 */

interface RateLimitEntry {
  count: number;
  /** Window start timestamp in ms */
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number;
  /** Window duration in seconds */
  windowSecs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check and increment the rate limit counter for a given key.
 *
 * @param key   Unique identifier (e.g. IP address, email)
 * @param opts  Limit and window configuration
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = opts.windowSecs * 1000;

  // Purge expired entries periodically to prevent unbounded memory growth.
  // Only runs 1% of the time to avoid overhead on every call.
  if (Math.random() < 0.01) {
    for (const [k, v] of store.entries()) {
      if (now - v.windowStart > windowMs) {
        store.delete(k);
      }
    }
  }

  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    // New or expired window — start fresh
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: opts.limit - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  if (entry.count >= opts.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.windowStart + windowMs),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: opts.limit - entry.count,
    resetAt: new Date(entry.windowStart + windowMs),
  };
}

/**
 * Extract a best-effort client IP from a Next.js Request.
 * Falls back to "unknown" if no header is present.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
