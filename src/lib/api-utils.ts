import { NextResponse } from "next/server";
import type { ZodSchema, ZodError } from "zod";
import { getApiActorContext, type ActorContext } from "@/lib/auth-utils";
import { type Permission } from "@/domain/permissions/matrix";
import { assertPermission, type Actor, PermissionError } from "@/domain/permissions/resolve";
import { rateLimit, getClientIp, type RateLimitOptions } from "@/lib/rate-limit";

export type AuthResult =
  | { actor: ActorContext; error: null }
  | { actor: null; error: NextResponse };

/**
 * Authenticate API request and optionally verify permission.
 * Returns `{ actor, error: null }` on success, or `{ actor: null, error: NextResponse }` on failure.
 *
 * Usage:
 *   const auth = await requireApiAuth("affiliate.queue.view");
 *   if (auth.error) return auth.error;
 *   const { actor } = auth;
 */
export async function requireApiAuth(permission?: Permission): Promise<AuthResult> {
  const actorCtx = await getApiActorContext();
  if (!actorCtx) {
    return {
      actor: null,
      error: NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      ),
    };
  }

  if (permission) {
    const actor: Actor = { id: actorCtx.userId, role: actorCtx.role };
    try {
      assertPermission(actor, permission);
    } catch (e: unknown) {
      if (e instanceof PermissionError) {
        return {
          actor: null,
          error: NextResponse.json(
            {
              ok: false,
              error: {
                code: e.code === "ERR_UNAUTHENTICATED" ? "UNAUTHORIZED" : "FORBIDDEN",
                message: e.message,
              },
            },
            { status: e.code === "ERR_UNAUTHENTICATED" ? 401 : 403 },
          ),
        };
      }
      throw e;
    }
  }

  return { actor: actorCtx, error: null };
}

/**
 * Check rate limit for an incoming Next.js Request based on client IP.
 * Returns `NextResponse` (429) if rate limited, or `null` if allowed.
 *
 * Usage:
 *   const rateLimitRes = checkRequestRateLimit(request, { limit: 5, windowSecs: 60 });
 *   if (rateLimitRes) return rateLimitRes;
 */
export function checkRequestRateLimit(
  request: Request,
  opts: RateLimitOptions,
): NextResponse | null {
  const ip = getClientIp(request);
  const result = rateLimit(ip, opts);

  if (!result.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  return null;
}

/**
 * Optimistic lock check.
 *
 * Compares `existing.lastUpdatedAt` against the `expectedTimestamp` string the
 * client sent. Returns a 409 NextResponse if they differ by more than 1 second,
 * or `null` if the lock passes (caller should continue).
 *
 * Usage:
 *   const conflict = checkOptimisticLock(existing, body.expectedLastUpdatedAt);
 *   if (conflict) return conflict;
 */
export function checkOptimisticLock(
  existing: { lastUpdatedAt: Date },
  expectedTimestamp: string,
): NextResponse | null {
  const expectedDate = new Date(expectedTimestamp);
  if (Math.abs(existing.lastUpdatedAt.getTime() - expectedDate.getTime()) > 1000) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CONFLICT_STALE_WRITE",
          message: "This request changed since you opened it. Reload and try again.",
        },
      },
      { status: 409 },
    );
  }
  return null;
}

/**
 * Parse and validate a JSON request body against a Zod schema.
 *
 * Returns `{ data }` on success, or `{ error: NextResponse }` on failure so
 * the caller can `return result.error` immediately.
 *
 * Usage:
 *   const result = await parseBody(request, mySchema);
 *   if ('error' in result) return result.error;
 *   const { field } = result.data;
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const zodError = parsed.error as ZodError;
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: zodError.issues[0]?.message ?? "Validation failed",
          },
        },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data };
}

export interface GetAccessibleRequestOptions {
  allowClosed?: boolean;
  expectedLastUpdatedAt?: string;
}

export type AccessibleRequestResult =
  | { request: import("@/generated/prisma/client").Request; error: null }
  | { request: null; error: NextResponse };

/**
 * Fetch a Request by ID, validating its existence (404), permissions (403),
 * closed status (400), and optimistic locking (409).
 */
export async function getAccessibleRequest(
  id: string,
  actor: Actor,
  permission?: Permission,
  options: GetAccessibleRequestOptions = {},
): Promise<AccessibleRequestResult> {
  const { prisma } = await import("@/lib/prisma");
  const { canAccessRequest } = await import("@/domain/permissions/resolve");

  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing) {
    return {
      request: null,
      error: NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      ),
    };
  }

  if (permission && !canAccessRequest(actor, existing, permission)) {
    return {
      request: null,
      error: NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 },
      ),
    };
  }

  if (!options.allowClosed && existing.status === "CLOSED") {
    return {
      request: null,
      error: NextResponse.json(
        { ok: false, error: { code: "INVALID_STATE", message: "Request is already closed" } },
        { status: 400 },
      ),
    };
  }

  if (options.expectedLastUpdatedAt) {
    const conflict = checkOptimisticLock(existing, options.expectedLastUpdatedAt);
    if (conflict) {
      return { request: null, error: conflict };
    }
  }

  return { request: existing, error: null };
}

export type ReconciliationRunResult<T = import("@/generated/prisma/client").ReconciliationRun> =
  | { run: T; error: null }
  | { run: null; error: NextResponse };

/**
 * Fetch a ReconciliationRun by ID, returning 404 NextResponse if not found.
 */
export async function findReconciliationRunOrError<
  T = import("@/generated/prisma/client").ReconciliationRun,
>(runId: string, fetcher?: (id: string) => Promise<T | null>): Promise<ReconciliationRunResult<T>> {
  let run: T | null;
  if (fetcher) {
    run = await fetcher(runId);
  } else {
    const { prisma } = await import("@/lib/prisma");
    run = (await prisma.reconciliationRun.findUnique({
      where: { id: runId },
    })) as T | null;
  }

  if (!run) {
    return {
      run: null,
      error: NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Reconciliation run not found" } },
        { status: 404 },
      ),
    };
  }

  return { run, error: null };
}

type AuthenticatedActor = {
  id: string;
  role: import("@/domain/permissions/matrix").Role;
};

export type AuthenticatedRequestResult<T> =
  | {
      id: string;
      actor: AuthenticatedActor;
      actorContext: ActorContext;
      data: T;
      error: null;
    }
  | {
      id: never;
      actor: never;
      actorContext: never;
      data: never;
      error: NextResponse;
    };

/**
 * Convenience helper combining authentication, route param extraction, and request body parsing.
 */
export async function parseAuthenticatedRequest<T>(
  request: Request,
  params: Promise<{ id: string }>,
  schema: ZodSchema<T>,
  permission?: Permission,
): Promise<AuthenticatedRequestResult<T>> {
  const auth = await requireApiAuth(permission);
  if (auth.error) {
    return { error: auth.error } as AuthenticatedRequestResult<T>;
  }

  const { id } = await params;
  const bodyResult = await parseBody(request, schema);
  if ("error" in bodyResult) {
    return { error: bodyResult.error } as AuthenticatedRequestResult<T>;
  }

  return {
    id,
    actor: { id: auth.actor.userId, role: auth.actor.role },
    actorContext: auth.actor,
    data: bodyResult.data,
    error: null,
  };
}
