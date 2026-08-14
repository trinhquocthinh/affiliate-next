import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editOrderSchema } from "@/lib/validations";
import { logAuditEvent, auditSourceFor } from "@/lib/audit";
import { parseAuthenticatedRequest, getAccessibleRequest } from "@/lib/api-utils";
import type { AuditAction } from "@/generated/prisma/client";

// PATCH /api/requests/[id]/order — admin/master update orderId and orderAmount at any status
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await parseAuthenticatedRequest(
      request,
      params,
      editOrderSchema,
      "request.order_id.edit_any_status",
    );
    if (ctx.error) return ctx.error;
    const { id, actor, data } = ctx;
    const { orderId, orderAmount } = data;

    const reqResult = await getAccessibleRequest(id, actor, undefined, {
      allowClosed: true,
    });
    if (reqResult.error) return reqResult.error;
    const existing = reqResult.request;

    const updateData: Record<string, unknown> = {
      lastUpdatedAt: new Date(),
      lastUpdatedById: actor.id,
    };

    let action: AuditAction = "EDIT_ORDER_ID";
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (orderId !== undefined) {
      updateData.orderId = orderId;
      oldValue.orderId = existing.orderId;
      newValue.orderId = orderId;
    }

    if (orderAmount !== undefined) {
      updateData.orderAmount = orderAmount;
      oldValue.orderAmount = existing.orderAmount;
      newValue.orderAmount = orderAmount;
      if (orderId === undefined) {
        action = "EDIT_ORDER_AMOUNT";
      }
    }

    const updated = await prisma.request.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.id,
      action,
      oldValue,
      newValue,
      source: auditSourceFor(actor.role, "affiliate_ui"),
    });

    return NextResponse.json({
      ok: true,
      data: { orderId: updated.orderId, orderAmount: updated.orderAmount },
    });
  } catch (error) {
    console.error("Patch order error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to update order info" } },
      { status: 500 },
    );
  }
}
