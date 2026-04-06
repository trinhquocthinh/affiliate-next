import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { queueFilterSchema } from "@/lib/validations";

// GET /api/affiliate/queue — affiliate work queue
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const parsed = queueFilterSchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { search, statusFilter, buyerId, sortBy, sortOrder, page, limit } = parsed.data;

    // Build where clause
    const conditions: Record<string, unknown>[] = [];

    // Status filter
    if (statusFilter === "OPEN") {
      conditions.push({ status: { in: ["NEW", "FILLED"] } });
    } else if (statusFilter !== "ALL") {
      conditions.push({ status: statusFilter });
    }

    // Buyer filter
    if (buyerId) {
      conditions.push({ createdById: buyerId });
    }

    // Search - case-insensitive across multiple fields
    if (search && search.trim()) {
      const searchTerm = search.trim();
      conditions.push({
        OR: [
          { id: { contains: searchTerm, mode: "insensitive" } },
          { productUrlRaw: { contains: searchTerm, mode: "insensitive" } },
          { productName: { contains: searchTerm, mode: "insensitive" } },
          { requesterName: { contains: searchTerm, mode: "insensitive" } },
          { requesterContact: { contains: searchTerm, mode: "insensitive" } },
          { notes: { contains: searchTerm, mode: "insensitive" } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { displayName: true, email: true } },
          affiliateOwner: { select: { displayName: true, email: true } },
        },
      }),
      prisma.request.count({ where }),
    ]);

    // Get config values
    const configs = await prisma.appConfig.findMany({
      where: { key: { in: ["STALE_REQUEST_HOURS", "DUPLICATE_WINDOW_HOURS"] } },
    });
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));
    const staleHours = parseInt(configMap.STALE_REQUEST_HOURS || "48", 10);
    const dupWindowHours = parseInt(configMap.DUPLICATE_WINDOW_HOURS || "24", 10);
    const staleThreshold = new Date(Date.now() - staleHours * 3600000);
    const dupCutoff = new Date(Date.now() - dupWindowHours * 3600000);

    // Build duplicate index for visibility
    const normUrls = [...new Set(items.map((i) => i.productUrlNorm))];
    const dupCounts: Record<string, number> = {};

    if (normUrls.length > 0) {
      const dupResults = await prisma.request.groupBy({
        by: ["productUrlNorm"],
        where: {
          productUrlNorm: { in: normUrls },
          status: { not: "CLOSED" },
          createdAt: { gte: dupCutoff },
        },
        _count: true,
      });
      for (const r of dupResults) {
        dupCounts[r.productUrlNorm] = r._count;
      }
    }

    // Summary stats (for the full unfiltered queue)
    const [totalQueue, staleCount, processedCount, buyers] = await Promise.all([
      prisma.request.count(),
      prisma.request.count({
        where: { status: { in: ["NEW", "FILLED"] }, createdAt: { lt: staleThreshold } },
      }),
      prisma.request.count({
        where: {
          affiliateOwnerId: { not: null },
        },
      }),
      prisma.user.findMany({
        where: { role: "BUYER", isActive: true },
        select: { id: true, displayName: true, email: true },
        orderBy: { displayName: "asc" },
      }),
    ]);

    const enrichedItems = items.map((item) => ({
      ...item,
      isStale: item.status !== "CLOSED" && item.createdAt < staleThreshold,
      ageHours: Math.floor((Date.now() - item.createdAt.getTime()) / 3600000),
      isClaimed: !!item.affiliateOwnerId,
      isOwnedByMe: item.affiliateOwnerId === actor.userId,
      hasPotentialDuplicate: !!item.duplicateOfId || (dupCounts[item.productUrlNorm] || 0) > 1,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        items: enrichedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary: {
          total: totalQueue,
          staleCount,
          processedCount,
        },
        buyers,
      },
    });
  } catch (error) {
    console.error("Affiliate queue error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to load queue" } },
      { status: 500 },
    );
  }
}
