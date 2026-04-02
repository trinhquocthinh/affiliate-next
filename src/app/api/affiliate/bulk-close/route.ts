import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { bulkCloseSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";

// POST /api/affiliate/bulk-close — bulk close old requests
export async function POST(request: Request) {
  try {
    const actor = await getApiActorContext();
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    if (!actor.isAffiliate) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Affiliate access required" } },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = bulkCloseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { olderThanDays, closeNote, dryRun } = parsed.data;
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600000);

    // Build candidate filter
    const ownershipFilter = actor.isAdmin
      ? {} // Admin can close all
      : { OR: [{ affiliateOwnerId: null }, { affiliateOwnerId: actor.userId }] };

    const candidateWhere = {
      status: { in: ["NEW" as const, "FILLED" as const] },
      createdAt: { lt: cutoff },
      ...ownershipFilter,
    };

    if (dryRun) {
      const candidates = await prisma.request.findMany({
        where: candidateWhere,
        take: 50,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          affiliateOwnerId: true,
        },
      });

      const totalCandidates = await prisma.request.count({
        where: candidateWhere,
      });

      return NextResponse.json({
        ok: true,
        data: {
          dryRun: true,
          candidateCount: totalCandidates,
          candidates: candidates.map((c) => ({
            requestId: c.id,
            status: c.status,
            createdAt: c.createdAt,
            affiliateOwnerId: c.affiliateOwnerId,
            ageHours: Math.floor(
              (Date.now() - c.createdAt.getTime()) / 3600000,
            ),
          })),
        },
      });
    }

    // Execute bulk close
    const now = new Date();
    const defaultCloseNote =
      closeNote ||
      `Bulk-closed after ${olderThanDays} days without completion.`;

    const result = await prisma.request.updateMany({
      where: candidateWhere,
      data: {
        status: "CLOSED",
        closeReason: "STALE",
        closeNote: defaultCloseNote,
        closedAt: now,
        closedById: actor.userId,
        lastUpdatedById: actor.userId,
      },
    });

    await logAuditEvent({
      actorId: actor.userId,
      action: "BULK_CLOSE",
      newValue: {
        closedCount: result.count,
        olderThanDays,
        closeNote: defaultCloseNote,
      },
      source: "affiliate_ui",
      remark: `Bulk closed ${result.count} requests older than ${olderThanDays} days`,
    });

    return NextResponse.json({
      ok: true,
      data: {
        closedCount: result.count,
      },
    });
  } catch (error) {
    console.error("Bulk close error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to bulk close" } },
      { status: 500 },
    );
  }
}
