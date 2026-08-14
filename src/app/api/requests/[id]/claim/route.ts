import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimRequestSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import { parseAuthenticatedRequest, getAccessibleRequest } from "@/lib/api-utils";
import { canAccessRequest, hasPermission } from "@/domain/permissions/resolve";

// POST /api/requests/[id]/claim
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await parseAuthenticatedRequest(request, params, claimRequestSchema);
    if (ctx.error) return ctx.error;
    const { id, actor, data, actorContext } = ctx;
    const { unclaim, expectedLastUpdatedAt } = data;

    const reqResult = await getAccessibleRequest(id, actor, undefined, {
      expectedLastUpdatedAt,
    });
    if (reqResult.error) return reqResult.error;
    const existing = reqResult.request;

    if (unclaim) {
      if (!canAccessRequest(actor, existing, "affiliate.unclaim")) {
        return NextResponse.json(
          // SPEC-006: thiếu thẩm quyền là 403, không phải 409 — 409 dành cho
          // xung đột trạng thái, không dành cho từ chối cấp quyền.
          {
            ok: false,
            error: { code: "FORBIDDEN", message: "Cannot unclaim another affiliate's request" },
          },
          { status: 403 },
        );
      }

      const updated = await prisma.request.update({
        where: { id },
        data: { affiliateOwnerId: null, lastUpdatedById: actor.id },
      });

      await logAuditEvent({
        requestId: id,
        actorId: actor.id,
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
    if (existing.affiliateOwnerId && existing.affiliateOwnerId !== actor.id) {
      if (!hasPermission(actor, "affiliate.claim.override")) {
        return NextResponse.json(
          {
            ok: false,
            error: { code: "CONFLICT_CLAIMED", message: "Already claimed by another affiliate" },
          },
          { status: 409 },
        );
      }
    } else {
      if (!hasPermission(actor, "affiliate.claim.unclaimed")) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: "Access denied" } },
          { status: 403 },
        );
      }
    }

    const isOverride = existing.affiliateOwnerId && existing.affiliateOwnerId !== actor.id;

    const updated = await prisma.request.update({
      where: { id },
      data: { affiliateOwnerId: actor.id, lastUpdatedById: actor.id },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.id,
      action: isOverride ? "OVERRIDE_CLAIM" : "CLAIM_REQUEST",
      oldValue: { affiliateOwnerId: existing.affiliateOwnerId },
      newValue: { affiliateOwnerId: actor.id },
      source: "affiliate_ui",
    });

    return NextResponse.json({
      ok: true,
      data: {
        affiliateOwner: actorContext.email,
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
