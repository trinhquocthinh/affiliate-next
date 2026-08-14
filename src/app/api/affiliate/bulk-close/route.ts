import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bulkCloseSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import { getPermissionScope, type Actor } from "@/domain/permissions/resolve";
import { requireApiAuth, parseBody } from "@/lib/api-utils";

// POST /api/affiliate/bulk-close — bulk close old requests
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth("affiliate.bulk_close");
    if (auth.error) return auth.error;
    const actor: Actor = { id: auth.actor.userId, role: auth.actor.role };

    const bodyResult = await parseBody(request, bulkCloseSchema);
    if ("error" in bodyResult) return bodyResult.error;

    const { olderThanDays, closeNote, dryRun } = bodyResult.data;
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600000);

    // Build candidate filter based on scope
    const scope = getPermissionScope(actor, "affiliate.bulk_close");
    const ownershipFilter =
      scope === "any" ? {} : { OR: [{ affiliateOwnerId: null }, { affiliateOwnerId: actor.id }] };

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
            ageHours: Math.floor((Date.now() - c.createdAt.getTime()) / 3600000),
          })),
        },
      });
    }

    // Execute bulk close
    const now = new Date();
    const defaultCloseNote =
      closeNote || `Bulk-closed after ${olderThanDays} days without completion.`;

    const result = await prisma.request.updateMany({
      where: candidateWhere,
      data: {
        status: "CLOSED",
        closeReason: "STALE",
        closeNote: defaultCloseNote,
        closedAt: now,
        closedById: actor.id,
        lastUpdatedById: actor.id,
      },
    });

    await logAuditEvent({
      actorId: actor.id,
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
