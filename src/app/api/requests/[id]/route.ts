import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { getAppConfig } from "@/lib/config-cache";

// GET /api/requests/[id] — get single request
export async function GET(
  _request: Request,
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

    const item = await prisma.request.findUnique({
      where: { id },
      include: {
        createdBy: { select: { displayName: true, email: true } },
        affiliateOwner: { select: { displayName: true, email: true } },
        closedBy: { select: { displayName: true, email: true } },
        lastUpdatedBy: { select: { displayName: true, email: true } },
      },
    });

    if (!item) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }

    // Buyers can only see their own requests
    if (actor.role === "BUYER" && item.createdById !== actor.userId) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 },
      );
    }

    // Compute stale status and duplicate window from config (cached)
    const config = await getAppConfig();
    const isStale =
      item.status !== "CLOSED" &&
      Date.now() - item.createdAt.getTime() >= config.STALE_REQUEST_HOURS * 3600000;
    const dupCutoff = new Date(Date.now() - config.DUPLICATE_WINDOW_HOURS * 3600000);

    const duplicateCount = await prisma.request.count({
      where: {
        productUrlNorm: item.productUrlNorm,
        status: { not: "CLOSED" },
        createdAt: { gte: dupCutoff },
        id: { not: item.id },
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...item,
        isStale,
        hasPotentialDuplicate: !!item.duplicateOfId || duplicateCount > 0,
        ageHours: Math.floor((Date.now() - item.createdAt.getTime()) / 3600000),
      },
    });
  } catch (error) {
    console.error("Get request error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to get request" } },
      { status: 500 },
    );
  }
}

// PATCH /api/requests/[id] — admin: update orderId
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
    const { orderId } = body as { orderId: string };

    if (typeof orderId !== "string" || !orderId.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "orderId is required" } },
        { status: 400 },
      );
    }

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Request not found" } },
        { status: 404 },
      );
    }
    if (existing.status !== "CLOSED" || existing.closeReason !== "BOUGHT") {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_STATE", message: "Order ID can only be updated on CLOSED/BOUGHT requests" } },
        { status: 422 },
      );
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { orderId: orderId.trim(), lastUpdatedAt: new Date(), lastUpdatedById: actor.userId },
    });

    return NextResponse.json({ ok: true, data: { orderId: updated.orderId } });
  } catch (error) {
    console.error("Patch request error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to update request" } },
      { status: 500 },
    );
  }
}
