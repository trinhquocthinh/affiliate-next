import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveBuyerNoteSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import { parseAuthenticatedRequest, getAccessibleRequest } from "@/lib/api-utils";

// POST /api/requests/[id]/buyer-note — buyer updates their own note
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await parseAuthenticatedRequest(request, params, saveBuyerNoteSchema);
    if (ctx.error) return ctx.error;
    const { id, actor, data } = ctx;
    const { buyerNote, expectedLastUpdatedAt } = data;

    const reqResult = await getAccessibleRequest(id, actor, "request.buyer_note", {
      expectedLastUpdatedAt,
    });
    if (reqResult.error) return reqResult.error;
    const existing = reqResult.request;

    const updated = await prisma.request.update({
      where: { id },
      data: {
        buyerNote: buyerNote || null,
        lastUpdatedById: actor.id,
      },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.id,
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
