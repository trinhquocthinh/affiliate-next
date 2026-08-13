import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { editOrderSchema } from "@/lib/validations";
import { logAuditEvent, auditSourceFor } from "@/lib/audit";
import { assertPermission, Actor, PermissionError } from "@/domain/permissions/resolve";

// PATCH /api/requests/[id]/order — admin/master update orderId and orderAmount at any status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actorCtx = await getApiActorContext();
    const actor: Actor = actorCtx ? { id: actorCtx.userId, role: actorCtx.role as NonNullable<Actor>["role"] } : null;

    try {
      assertPermission(actor, "request.order_id.edit_any_status");
    } catch (e: unknown) {
      if (e instanceof PermissionError) {
        return NextResponse.json(
          { ok: false, error: { code: (e as any).code === "ERR_UNAUTHENTICATED" ? "UNAUTHORIZED" : "FORBIDDEN", message: (e as any).message } },
          { status: (e as any).code === "ERR_UNAUTHENTICATED" ? 401 : 403 },
        );
      }
      throw e;
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = editOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { orderId, orderAmount } = parsed.data;

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {
      lastUpdatedAt: new Date(),
      lastUpdatedById: actor!.id,
    };

    let action = "EDIT_ORDER_ID";
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
      actorId: actor!.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      action: action as any,
      oldValue,
      newValue,
      source: auditSourceFor(actorCtx!.role, "affiliate_ui"),
    });

    return NextResponse.json({ ok: true, data: { orderId: updated.orderId, orderAmount: updated.orderAmount } });
  } catch (error) {
    console.error("Patch order error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to update order info" } },
      { status: 500 },
    );
  }
}
