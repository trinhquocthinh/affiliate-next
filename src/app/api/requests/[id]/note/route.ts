import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { saveNoteSchema } from "@/lib/validations";
import { logAuditEvent, auditRemark, isOwnershipOverride } from "@/lib/audit";
import { checkOptimisticLock } from "@/lib/api-utils";
import { canAccessRequest, Actor } from "@/domain/permissions/resolve";

// POST /api/requests/[id]/note
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actorCtx = await getApiActorContext();
    const actor: Actor = actorCtx ? { id: actorCtx.userId, role: actorCtx.role as NonNullable<Actor>["role"] } : null;

    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = saveNoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { note, expectedLastUpdatedAt } = parsed.data;

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_STATE", message: "Cannot edit a closed request" } },
        { status: 400 },
      );
    }

    // Use matrix to verify permission
    if (!canAccessRequest(actor, existing, "affiliate.note")) {
      return NextResponse.json(
        { ok: false, error: { code: "CONFLICT_CLAIMED", message: "Cannot edit notes on another affiliate's request" } },
        { status: 409 },
      );
    }

    const conflict = checkOptimisticLock(existing, expectedLastUpdatedAt);
    if (conflict) return conflict;

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
        affiliateOwner: shouldAutoClaim ? actorCtx!.email : undefined,
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
