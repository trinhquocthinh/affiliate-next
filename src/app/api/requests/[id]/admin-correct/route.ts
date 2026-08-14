import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminCorrectSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import { getPermissionScope, hasPermission } from "@/domain/permissions/resolve";
import { parseAuthenticatedRequest, getAccessibleRequest } from "@/lib/api-utils";

// PATCH /api/requests/[id]/admin-correct — admin-only: correct orderId / buyerNote regardless of status
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await parseAuthenticatedRequest(request, params, adminCorrectSchema);
    if (ctx.error) return ctx.error;
    const { id, actor, data } = ctx;

    const canCorrect =
      getPermissionScope(actor, "request.buyer_note") === "any" &&
      hasPermission(actor, "request.order_id.edit_any_status");

    if (!canCorrect) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const { orderId, buyerNote } = data;

    const reqResult = await getAccessibleRequest(id, actor, undefined, { allowClosed: true });
    if (reqResult.error) return reqResult.error;
    const existing = reqResult.request;

    const updateData: Record<string, unknown> = { lastUpdatedById: actor.id };
    if (orderId !== undefined) updateData.orderId = orderId || null;
    if (buyerNote !== undefined) updateData.buyerNote = buyerNote || null;

    const updated = await prisma.request.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.id,
      action: "SAVE_NOTE",
      oldValue: { orderId: existing.orderId, buyerNote: existing.buyerNote },
      newValue: { orderId: updated.orderId, buyerNote: updated.buyerNote },
      source: "admin",
      remark: "admin correction",
    });

    return NextResponse.json({
      ok: true,
      data: {
        orderId: updated.orderId,
        buyerNote: updated.buyerNote,
        lastUpdatedAt: updated.lastUpdatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Admin correct error:", message);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to save correction" } },
      { status: 500 },
    );
  }
}
