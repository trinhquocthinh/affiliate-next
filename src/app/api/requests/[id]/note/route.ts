import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { saveNoteSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";

// POST /api/requests/[id]/note
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

    // Non-admin cannot edit notes on requests claimed by others
    if (existing.affiliateOwnerId && existing.affiliateOwnerId !== actor.userId && !actor.isAdmin) {
      return NextResponse.json(
        { ok: false, error: { code: "CONFLICT_CLAIMED", message: "Cannot edit notes on another affiliate's request" } },
        { status: 409 },
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

    // Auto-claim if unclaimed
    const shouldAutoClaim = !existing.affiliateOwnerId;

    const updated = await prisma.request.update({
      where: { id },
      data: {
        notes: note || null,
        affiliateOwnerId: shouldAutoClaim ? actor.userId : undefined,
        lastUpdatedById: actor.userId,
      },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.userId,
      action: "SAVE_NOTE",
      oldValue: { notes: existing.notes },
      newValue: { notes: note, autoClaimed: shouldAutoClaim },
      source: "affiliate_ui",
    });

    return NextResponse.json({
      ok: true,
      data: {
        notes: updated.notes,
        affiliateOwner: shouldAutoClaim ? actor.email : undefined,
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
