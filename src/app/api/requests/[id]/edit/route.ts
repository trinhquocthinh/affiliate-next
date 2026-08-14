import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editRequestSchema } from "@/lib/validations";
import { normalizeProductUrl } from "@/lib/url-utils";
import { logAuditEvent, auditSourceFor } from "@/lib/audit";
import { parseAuthenticatedRequest, getAccessibleRequest } from "@/lib/api-utils";

// PATCH /api/requests/[id]/edit — buyer edits their own request before it's closed
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await parseAuthenticatedRequest(request, params, editRequestSchema);
    if (ctx.error) return ctx.error;
    const { id, actor, data } = ctx;
    const { productUrl, platform, productName, expectedLastUpdatedAt } = data;

    const reqResult = await getAccessibleRequest(id, actor, "request.edit", {
      expectedLastUpdatedAt,
    });
    if (reqResult.error) return reqResult.error;
    const existing = reqResult.request;

    const updateData: Record<string, unknown> = { lastUpdatedById: actor.id };
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
      actorId: actor.id,
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
      source: auditSourceFor(actor.role, "buyer_ui"),
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
