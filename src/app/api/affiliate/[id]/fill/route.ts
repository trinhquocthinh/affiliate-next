import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { fillLinkSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import { checkOptimisticLock } from "@/lib/api-utils";

// POST /api/affiliate/[id]/fill — fill affiliate link
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
    const parsed = fillLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { affiliateLink, note, expectedLastUpdatedAt } = parsed.data;

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_STATE", message: "Cannot fill a closed request" } },
        { status: 400 },
      );
    }

    const conflict = checkOptimisticLock(existing, expectedLastUpdatedAt);
    if (conflict) return conflict;

    const updated = await prisma.request.update({
      where: { id },
      data: {
        affiliateLink,
        filledAt: new Date(),
        status: "FILLED",
        affiliateOwnerId: existing.affiliateOwnerId || actor.userId,
        notes: note !== undefined ? (note || null) : existing.notes,
        lastUpdatedById: actor.userId,
      },
    });

    await logAuditEvent({
      requestId: id,
      actorId: actor.userId,
      action: "FILL_AFFILIATE_LINK",
      oldValue: {
        status: existing.status,
        affiliateLink: existing.affiliateLink,
      },
      newValue: {
        status: "FILLED",
        affiliateLink,
        note,
      },
      source: "affiliate_ui",
    });

    return NextResponse.json({
      ok: true,
      data: {
        status: updated.status,
        affiliateLink: updated.affiliateLink,
        affiliateOwner: actor.email,
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
