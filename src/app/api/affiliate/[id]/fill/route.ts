import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fillLinkSchema } from "@/lib/validations";
import { logAuditEvent, auditRemark, isOwnershipOverride } from "@/lib/audit";
import { parseAuthenticatedRequest, getAccessibleRequest } from "@/lib/api-utils";

// POST /api/affiliate/[id]/fill — fill affiliate link
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await parseAuthenticatedRequest(request, params, fillLinkSchema);
    if (ctx.error) return ctx.error;
    const { id, actor, data, actorContext } = ctx;

    const reqResult = await getAccessibleRequest(id, actor, "affiliate.fill", {
      expectedLastUpdatedAt: data.expectedLastUpdatedAt,
    });
    if (reqResult.error) return reqResult.error;
    const existing = reqResult.request;

    const { affiliateLink, note, subIdStamped } = data;

    const updated = await prisma.request.update({
      where: { id },
      data: {
        affiliateLink,
        filledAt: new Date(),
        status: "FILLED",
        affiliateOwnerId: existing.affiliateOwnerId || actor.id,
        notes: note !== undefined ? note || null : existing.notes,
        subIdStamped,
        lastUpdatedById: actor.id,
      },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.id,
      action: "FILL_AFFILIATE_LINK",
      oldValue: {
        status: existing.status,
        affiliateLink: existing.affiliateLink,
      },
      newValue: {
        status: "FILLED",
        affiliateLink,
        note,
        subIdStamped,
      },
      source: "affiliate_ui",
      // BR-051: điền vào việc người khác giữ, và thay đè link đã có, đều là
      // các trường hợp phải nhận ra được khi rà dấu vết về sau.
      remark: auditRemark(
        isOwnershipOverride(actor.id, existing) && "ownership_override",
        !!existing.affiliateLink && "link_replaced",
      ),
    });

    return NextResponse.json({
      ok: true,
      data: {
        status: updated.status,
        affiliateLink: updated.affiliateLink,
        affiliateOwner: actorContext.email,
        lastUpdatedAt: updated.lastUpdatedAt,
      },
    });
  } catch (error) {
    console.error("Fill affiliate link error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to fill affiliate link" } },
      { status: 500 },
    );
  }
}
