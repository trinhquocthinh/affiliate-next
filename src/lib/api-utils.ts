import { NextResponse } from "next/server";
import type { ZodSchema, ZodError } from "zod";

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
