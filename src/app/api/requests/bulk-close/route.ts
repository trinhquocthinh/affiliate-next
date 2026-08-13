import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { getAppConfig } from "@/lib/config-cache";
import { logAuditEvent } from "@/lib/audit";
import { assertPermission, Actor } from "@/domain/permissions/resolve";

type AuthResult =
  | { kind: "cron" }
  | { kind: "admin"; userId: string }
  | { kind: "unauthorized"; status: 401 | 403; message: string };

function checkCronSecret(request: Request): boolean {
  const header = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!header || !secret) return false;

  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function authorize(request: Request): Promise<AuthResult> {
  if (checkCronSecret(request)) {
    return { kind: "cron" };
  }

  const actorCtx = await getApiActorContext();
  if (!actorCtx) {
    return { kind: "unauthorized", status: 401, message: "Not authenticated" };
  }

  const actor: Actor = { id: actorCtx.userId, role: actorCtx.role as NonNullable<Actor>["role"] };
  try {
    assertPermission(actor, "system.bulk_close");
    return { kind: "admin", userId: actor.id };
  } catch {
    return { kind: "unauthorized", status: 403, message: "System bulk close access required" };
  }
}

async function runBulkClose(
  auth: { kind: "cron" } | { kind: "admin"; userId: string },
  olderThanDaysOverride?: number,
) {
  const config = await getAppConfig();
  const olderThanDays =
    olderThanDaysOverride && Number.isFinite(olderThanDaysOverride) && olderThanDaysOverride > 0
      ? Math.min(Math.floor(olderThanDaysOverride), 3650)
      : config.BULK_CLOSE_MIN_DAYS;

  const now = new Date();
  const cutoff = new Date(now.getTime() - olderThanDays * 24 * 3600 * 1000);
  const source = auth.kind === "cron" ? "cron" : "admin";
  const actorId = auth.kind === "admin" ? auth.userId : undefined;

  const closeNote = `Auto-closed after ${olderThanDays} days without completion (${source}).`;

  const result = await prisma.request.updateMany({
    where: {
      status: { in: ["NEW", "FILLED"] },
      createdAt: { lt: cutoff },
    },
    data: {
      status: "CLOSED",
      closeReason: "STALE",
      closeNote,
      closedAt: now,
      closedById: actorId ?? null,
      lastUpdatedById: actorId ?? null,
    },
  });

  await logAuditEvent({
    actorId,
    // Chạy bằng cron thì không có người thao tác — khai báo rõ thay vì để
    // `actorId` rỗng đi qua âm thầm (SPEC-009).
    systemActor: auth.kind === "cron",
    action: "BULK_CLOSE",
    newValue: { closedCount: result.count, olderThanDays, cutoff },
    source,
    remark: `Bulk-closed ${result.count} requests older than ${olderThanDays} days`,
  });

  return { closedCount: result.count, olderThanDays, source };
}

async function handle(request: Request, allowBody: boolean) {
  try {
    const auth = await authorize(request);
    if (auth.kind === "unauthorized") {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: auth.message } },
        { status: auth.status },
      );
    }

    let olderThanDaysOverride: number | undefined;
    if (allowBody) {
      try {
        const text = await request.text();
        if (text) {
          const body = JSON.parse(text) as { olderThanDays?: unknown };
          if (typeof body.olderThanDays === "number") {
            olderThanDaysOverride = body.olderThanDays;
          }
        }
      } catch {
        // ignore malformed body — treat as no override
      }
    }

    const data = await runBulkClose(auth, olderThanDaysOverride);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Bulk close error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to bulk close" } },
      { status: 500 },
    );
  }
}

// POST — used by the admin "Run Cleanup Now" button (accepts optional { olderThanDays })
export async function POST(request: Request) {
  return handle(request, true);
}

// GET — used by Vercel Cron (Bearer ${CRON_SECRET})
export async function GET(request: Request) {
  return handle(request, false);
}
