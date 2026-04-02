import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { closeRequestSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";

// POST /api/requests/[id]/close
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
    const parsed = closeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { closeReason, closeNote, orderId, expectedLastUpdatedAt } = parsed.data;

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_STATE", message: "Request is already closed" } },
        { status: 400 },
      );
    }

    // Buyer can only close their own FILLED requests
    if (actor.role === "BUYER") {
      if (existing.createdById !== actor.userId) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: "Access denied" } },
          { status: 403 },
        );
      }
      if (existing.status !== "FILLED") {
        return NextResponse.json(
          { ok: false, error: { code: "INVALID_STATE", message: "Can only close filled requests" } },
          { status: 400 },
        );
      }
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

    const now = new Date();
    const updated = await prisma.request.update({
      where: { id },
      data: {
        status: "CLOSED",
        closeReason,
        closeNote: closeNote || null,
        orderId: closeReason === "BOUGHT" ? (orderId || null) : null,
        closedAt: now,
        closedById: actor.userId,
        affiliateOwnerId: existing.affiliateOwnerId || (actor.isAffiliate ? actor.userId : undefined),
        lastUpdatedById: actor.userId,
      },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.userId,
      action: "CLOSE_REQUEST",
      oldValue: { status: existing.status, closeReason: existing.closeReason },
      newValue: { status: "CLOSED", closeReason, closeNote, orderId },
      source: actor.role === "BUYER" ? "buyer_ui" : "affiliate_ui",
    });

    return NextResponse.json({
      ok: true,
      data: {
        status: updated.status,
        closeReason: updated.closeReason,
        closedAt: updated.closedAt,
        closedBy: actor.email,
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
