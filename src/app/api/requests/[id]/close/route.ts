import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeRequestSchema } from "@/lib/validations";
import { logAuditEvent, closeAuditSourceFor, auditRemark, isOwnershipOverride } from "@/lib/audit";
import { parseAuthenticatedRequest, getAccessibleRequest } from "@/lib/api-utils";
import { hasPermission } from "@/domain/permissions/resolve";

// POST /api/requests/[id]/close
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await parseAuthenticatedRequest(request, params, closeRequestSchema);
    if (ctx.error) return ctx.error;
    const { id, actor, data, actorContext } = ctx;
    const { closeReason, closeNote, orderId, expectedLastUpdatedAt } = data;

    const reqResult = await getAccessibleRequest(id, actor, "request.close", {
      expectedLastUpdatedAt,
    });
    if (reqResult.error) return reqResult.error;
    const existing = reqResult.request;

    const now = new Date();
    const updated = await prisma.request.update({
      where: { id },
      data: {
        status: "CLOSED",
        closeReason,
        closeNote: closeNote || null,
        orderId: closeReason === "BOUGHT" ? orderId || null : null,
        closedAt: now,
        closedById: actor.id,
        // Đóng một yêu cầu chưa ai giữ thì người đóng nhận luôn việc — nhưng
        // chỉ khi họ vốn có thể nhận việc. Người mua đóng yêu cầu của mình
        // không vì thế mà thành người giữ.
        affiliateOwnerId:
          existing.affiliateOwnerId ||
          (hasPermission(actor, "affiliate.claim.unclaimed") ? actor.id : undefined),
        lastUpdatedById: actor.id,
      },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.id,
      action: "CLOSE_REQUEST",
      oldValue: { status: existing.status, closeReason: existing.closeReason },
      newValue: { status: "CLOSED", closeReason, closeNote, orderId },
      source: closeAuditSourceFor(actor.role),
      // BR-051: đóng yêu cầu của người khác. `orderId` đi kèm lúc đóng cũng
      // thuộc diện BR-052 nên đánh dấu luôn, để rà một lần ra cả hai.
      remark: auditRemark(
        isOwnershipOverride(actor.id, existing) && "ownership_override",
        !!orderId && "order_id_set",
      ),
    });

    return NextResponse.json({
      ok: true,
      data: {
        status: updated.status,
        closeReason: updated.closeReason,
        closedAt: updated.closedAt,
        closedBy: actorContext.email,
        lastUpdatedAt: updated.lastUpdatedAt,
      },
    });
  } catch (error) {
    console.error("Close request error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to close request" } },
      { status: 500 },
    );
  }
}
