import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveNoteSchema } from "@/lib/validations";
import { logAuditEvent, auditRemark, isOwnershipOverride } from "@/lib/audit";
import { parseAuthenticatedRequest, getAccessibleRequest } from "@/lib/api-utils";
import { canAccessRequest } from "@/domain/permissions/resolve";

// POST /api/requests/[id]/note
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await parseAuthenticatedRequest(request, params, saveNoteSchema);
    if (ctx.error) return ctx.error;
    const { id, actor, data, actorContext } = ctx;
    const { note, expectedLastUpdatedAt } = data;

    const reqResult = await getAccessibleRequest(id, actor, undefined, {
      expectedLastUpdatedAt,
    });
    if (reqResult.error) return reqResult.error;
    const existing = reqResult.request;

    // Use matrix to verify permission
    if (!canAccessRequest(actor, existing, "affiliate.note")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "CONFLICT_CLAIMED",
            message: "Cannot edit notes on another affiliate's request",
          },
        },
        { status: 409 },
      );
    }

    // Auto-claim if unclaimed
    const shouldAutoClaim = !existing.affiliateOwnerId;

    const updated = await prisma.request.update({
      where: { id },
      data: {
        notes: note || null,
        affiliateOwnerId: shouldAutoClaim ? actor.id : undefined,
        lastUpdatedById: actor.id,
      },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.id,
      action: "SAVE_NOTE",
      oldValue: { notes: existing.notes },
      newValue: { notes: note, autoClaimed: shouldAutoClaim },
      source: "affiliate_ui",
      // BR-051: sửa ghi chú trên việc người khác đang giữ. Tự nhận việc chưa
      // ai giữ thì không tính — lúc đó chưa có ai để mà vượt qua.
      remark: auditRemark(
        !shouldAutoClaim && isOwnershipOverride(actor.id, existing) && "ownership_override",
      ),
    });

    return NextResponse.json({
      ok: true,
      data: {
        notes: updated.notes,
        affiliateOwner: shouldAutoClaim ? actorContext.email : undefined,
        lastUpdatedAt: updated.lastUpdatedAt,
      },
    });
  } catch (error) {
    console.error("Save note error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to save note" } },
      { status: 500 },
    );
  }
}
