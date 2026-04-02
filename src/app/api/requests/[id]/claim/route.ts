import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { claimRequestSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";

// POST /api/requests/[id]/claim
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();
    const parsed = claimRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { unclaim, expectedLastUpdatedAt } = parsed.data;

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_STATE", message: "Cannot claim a closed request" } },
        { status: 400 },
      );
    }

    // Optimistic locking
    const expectedDate = new Date(expectedLastUpdatedAt);
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

    if (unclaim) {
      // Unclaim: only owner or admin can unclaim
      if (!actor.isAdmin && existing.affiliateOwnerId !== actor.userId) {
        return NextResponse.json(
          { ok: false, error: { code: "CONFLICT_CLAIMED", message: "Cannot unclaim another affiliate's request" } },
          { status: 409 },
        );
      }

      const updated = await prisma.request.update({
        where: { id },
        data: { affiliateOwnerId: null, lastUpdatedById: actor.userId },
      });

      await logAuditEvent({
        requestId: id,
        actorId: actor.userId,
        action: "UNCLAIM_REQUEST",
        oldValue: { affiliateOwnerId: existing.affiliateOwnerId },
        newValue: { affiliateOwnerId: null },
        source: "affiliate_ui",
      });

      return NextResponse.json({
        ok: true,
        data: {
          affiliateOwner: null,
          lastUpdatedAt: updated.lastUpdatedAt,
        },
      });
    }

    // Claim: check if already claimed by another
    if (existing.affiliateOwnerId && existing.affiliateOwnerId !== actor.userId && !actor.isAdmin) {
      return NextResponse.json(
        { ok: false, error: { code: "CONFLICT_CLAIMED", message: "Already claimed by another affiliate" } },
        { status: 409 },
      );
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { affiliateOwnerId: actor.userId, lastUpdatedById: actor.userId },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.userId,
      action: "CLAIM_REQUEST",
      oldValue: { affiliateOwnerId: existing.affiliateOwnerId },
      newValue: { affiliateOwnerId: actor.userId },
      source: "affiliate_ui",
    });

    return NextResponse.json({
      ok: true,
      data: {
        affiliateOwner: actor.email,
        lastUpdatedAt: updated.lastUpdatedAt,
      },
    });
  } catch (error) {
    console.error("Claim request error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to claim request" } },
      { status: 500 },
    );
  }
}
