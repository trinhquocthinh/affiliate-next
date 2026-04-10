import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext, ApiError } from "@/lib/auth-utils";
import { createRequestSchema, batchCreateSchema } from "@/lib/validations";
import { getAppConfig } from "@/lib/config-cache";
import { normalizeProductUrl } from "@/lib/url-utils";
import { generateRequestId } from "@/lib/request-id";
import { logAuditEvent } from "@/lib/audit";

// GET /api/requests — list requests (buyer: own, affiliate/admin: all)
export async function GET(request: Request) {
  try {
    const actor = await getApiActorContext();
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const statusFilter = searchParams.get("status");

    const where: Record<string, unknown> = {};

    // Buyers see only their own requests
    if (actor.role === "BUYER") {
      where.createdById = actor.userId;
    }

    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { displayName: true, email: true } },
          affiliateOwner: { select: { displayName: true, email: true } },
          closedBy: { select: { displayName: true, email: true } },
        },
      }),
      prisma.request.count({ where }),
    ]);

    // Get stale threshold from config (cached)
    const config = await getAppConfig();
    const staleThreshold = new Date(Date.now() - config.STALE_REQUEST_HOURS * 60 * 60 * 1000);

    const enrichedItems = items.map((item) => ({
      ...item,
      isStale: item.status !== "CLOSED" && item.createdAt < staleThreshold,
      ageHours: Math.floor(
        (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60),
      ),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        items: enrichedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List requests error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to list requests" } },
      { status: 500 },
    );
  }
}

// POST /api/requests — create single or batch requests
export async function POST(request: Request) {
  try {
    const actor = await getApiActorContext();
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Detect batch vs single by presence of "items" array
    if (body.items && Array.isArray(body.items)) {
      return handleBatchCreate(body, actor);
    }
    return handleSingleCreate(body, actor);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    console.error("Create request error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to create request" } },
      { status: 500 },
    );
  }
}

type ActorCtx = NonNullable<Awaited<ReturnType<typeof getApiActorContext>>>;

async function handleSingleCreate(body: unknown, actor: ActorCtx) {
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }

  const { productUrl, platform, productName, requesterName } = parsed.data;
  const productUrlNorm = normalizeProductUrl(productUrl);

  // Duplicate detection (config cached)
  const config = await getAppConfig();
  const dupCutoff = new Date(Date.now() - config.DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000);

  const duplicates = await prisma.request.findMany({
    where: {
      productUrlNorm,
      status: { not: "CLOSED" },
      createdAt: { gte: dupCutoff },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, createdAt: true, status: true },
  });

  const duplicateDetected = duplicates.length > 0;
  const requestId = await generateRequestId();

  const created = await prisma.request.create({
    data: {
      id: requestId,
      createdById: actor.userId,
      requesterName: requesterName || actor.displayName,
      requesterContact: actor.email,
      platform,
      productUrlRaw: productUrl,
      productUrlNorm,
      productName: productName || null,
      duplicateOfId: duplicateDetected ? duplicates[0].id : null,
      lastUpdatedById: actor.userId,
    },
  });

  await logAuditEvent({
    requestId: created.id,
    actorId: actor.userId,
    action: "CREATE_REQUEST",
    newValue: {
      platform,
      productUrl,
      productName,
      duplicateDetected,
      duplicateOfId: created.duplicateOfId,
    },
    source: "buyer_ui",
  });

  return NextResponse.json({
    ok: true,
    data: {
      requestId: created.id,
      status: created.status,
      duplicateDetected,
      duplicateOfRequestId: created.duplicateOfId,
      duplicateMatches: duplicates.map((d) => ({
        requestId: d.id,
        createdAt: d.createdAt,
        status: d.status,
      })),
    },
  });
}

async function handleBatchCreate(body: unknown, actor: ActorCtx) {
  const parsed = batchCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }

  const { items, platform, requesterName } = parsed.data;

  // Get config for duplicate detection (cached)
  const config = await getAppConfig();
  const dupCutoff = new Date(Date.now() - config.DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000);

  const results: Array<{
    requestId: string;
    status: string;
    duplicateDetected: boolean;
    duplicateOfRequestId: string | null;
  }> = [];

  let createdCount = 0;
  let duplicateCount = 0;

  // Track normalized URLs within this batch to detect intra-batch duplicates
  const batchNormUrls: string[] = [];

  for (const item of items) {
    const productUrlNorm = normalizeProductUrl(item.productUrl);

    // Check for duplicates in DB
    const dbDuplicates = await prisma.request.findMany({
      where: {
        productUrlNorm,
        status: { not: "CLOSED" },
        createdAt: { gte: dupCutoff },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { id: true },
    });

    // Check for intra-batch duplicates (items earlier in this same batch)
    const intraBatchDup = batchNormUrls.includes(productUrlNorm);

    const duplicateDetected = dbDuplicates.length > 0 || intraBatchDup;
    if (duplicateDetected) duplicateCount++;

    const requestId = await generateRequestId();

    await prisma.request.create({
      data: {
        id: requestId,
        createdById: actor.userId,
        requesterName: requesterName || actor.displayName,
        requesterContact: actor.email,
        platform,
        productUrlRaw: item.productUrl,
        productUrlNorm,
        productName: item.productName || null,
        duplicateOfId: dbDuplicates[0]?.id || null,
        lastUpdatedById: actor.userId,
      },
    });

    batchNormUrls.push(productUrlNorm);
    createdCount++;

    results.push({
      requestId,
      status: "NEW",
      duplicateDetected,
      duplicateOfRequestId: dbDuplicates[0]?.id || null,
    });
  }

  await logAuditEvent({
    actorId: actor.userId,
    action: "CREATE_REQUEST",
    newValue: {
      batchSize: items.length,
      createdCount,
      duplicateCount,
      platform,
    },
    source: "buyer_ui",
    remark: `Batch create: ${createdCount} created, ${duplicateCount} with duplicates`,
  });

  return NextResponse.json({
    ok: true,
    data: {
      createdCount,
      duplicateCount,
      items: results,
    },
  });
}
