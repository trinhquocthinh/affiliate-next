import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { claimRequestSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import { checkOptimisticLock } from "@/lib/api-utils";
import { canAccessRequest, hasPermission, Actor } from "@/domain/permissions/resolve";

// POST /api/requests/[id]/claim
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actorCtx = await getApiActorContext();
    const actor: Actor = actorCtx ? { id: actorCtx.userId, role: actorCtx.role as any } : null;

    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
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

    const conflict = checkOptimisticLock(existing, expectedLastUpdatedAt);
    if (conflict) return conflict;

    if (unclaim) {
      if (!canAccessRequest(actor, existing, "affiliate.unclaim")) {
        return NextResponse.json(
          // SPEC-006: thiếu thẩm quyền là 403, không phải 409 — 409 dành cho
          // xung đột trạng thái, không dành cho từ chối cấp quyền.
          { ok: false, error: { code: "FORBIDDEN", message: "Cannot unclaim another affiliate's request" } },
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
          { ok: false, error: { code: "CONFLICT_CLAIMED", message: "Already claimed by another affiliate" } },
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
        affiliateOwner: actorCtx!.email,
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
