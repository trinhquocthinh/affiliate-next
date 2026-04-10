import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { editRequestSchema } from "@/lib/validations";
import { normalizeProductUrl } from "@/lib/url-utils";
import { logAuditEvent } from "@/lib/audit";
import { checkOptimisticLock } from "@/lib/api-utils";

// PATCH /api/requests/[id]/edit — buyer edits their own request before it's closed
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

    const { id } = await params;
    const body = await request.json();
    const parsed = editRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { productUrl, platform, productName, expectedLastUpdatedAt } = parsed.data;

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }

    // Buyers can only edit their own requests; admins can edit any
    if (!actor.isAdmin && existing.createdById !== actor.userId) {
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

    const updateData: Record<string, unknown> = { lastUpdatedById: actor.userId };
    if (productUrl !== undefined) {
      updateData.productUrlRaw = productUrl;
      updateData.productUrlNorm = normalizeProductUrl(productUrl);
    }
    if (platform !== undefined) updateData.platform = platform;
    if (productName !== undefined) updateData.productName = productName || null;

    const updated = await prisma.request.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.userId,
      action: "SAVE_NOTE",
      oldValue: {
        productUrlRaw: existing.productUrlRaw,
        platform: existing.platform,
        productName: existing.productName,
      },
      newValue: {
        productUrlRaw: updated.productUrlRaw,
        platform: updated.platform,
        productName: updated.productName,
      },
      source: actor.isAdmin ? "admin" : "buyer_ui",
    });

    return NextResponse.json({
      ok: true,
      data: {
        productUrlRaw: updated.productUrlRaw,
        platform: updated.platform,
        productName: updated.productName,
        lastUpdatedAt: updated.lastUpdatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Edit request error:", message);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to edit request" } },
      { status: 500 },
    );
  }
}
