import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { adminCorrectSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";

// PATCH /api/requests/[id]/admin-correct — admin-only: correct orderId / buyerNote regardless of status
export async function PATCH(
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

    if (!actor.isAdmin) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = adminCorrectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { orderId, buyerNote } = parsed.data;

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = { lastUpdatedById: actor.userId };
    if (orderId !== undefined) updateData.orderId = orderId || null;
    if (buyerNote !== undefined) updateData.buyerNote = buyerNote || null;

    const updated = await prisma.request.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.userId,
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
