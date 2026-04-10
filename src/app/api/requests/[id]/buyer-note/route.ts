import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { saveBuyerNoteSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import { checkOptimisticLock } from "@/lib/api-utils";

// POST /api/requests/[id]/buyer-note — buyer updates their own note
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

    const { id } = await params;
    const body = await request.json();
    const parsed = saveBuyerNoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { buyerNote, expectedLastUpdatedAt } = parsed.data;

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }

    // Buyer can only edit their own requests
    if (existing.createdById !== actor.userId && !actor.isAdmin) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "You can only edit your own requests" } },
        { status: 403 },
      );
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_STATE", message: "Cannot edit a closed request" } },
        { status: 400 },
      );
    }

    const conflict = checkOptimisticLock(existing, expectedLastUpdatedAt);
    if (conflict) return conflict;

    const updated = await prisma.request.update({
      where: { id },
      data: {
        buyerNote: buyerNote || null,
        lastUpdatedById: actor.userId,
      },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.userId,
      action: "SAVE_NOTE",
      oldValue: { buyerNote: existing.buyerNote },
      newValue: { buyerNote },
      source: "buyer_ui",
    });

    return NextResponse.json({
      ok: true,
      data: {
        buyerNote: updated.buyerNote,
        lastUpdatedAt: updated.lastUpdatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Save buyer note error:", message, stack ?? error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to save note" } },
      { status: 500 },
    );
  }
}
