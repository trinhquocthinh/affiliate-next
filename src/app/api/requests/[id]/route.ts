import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";

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

    // Compute stale status
    const staleConfig = await prisma.appConfig.findUnique({
      where: { key: "STALE_REQUEST_HOURS" },
    });
    const staleHours = parseInt(staleConfig?.value || "48", 10);
    const isStale =
      item.status !== "CLOSED" &&
      Date.now() - item.createdAt.getTime() >= staleHours * 3600000;

    // Check for duplicates
    const dupConfig = await prisma.appConfig.findUnique({
      where: { key: "DUPLICATE_WINDOW_HOURS" },
    });
    const dupWindowHours = parseInt(dupConfig?.value || "24", 10);
    const dupCutoff = new Date(Date.now() - dupWindowHours * 3600000);

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
