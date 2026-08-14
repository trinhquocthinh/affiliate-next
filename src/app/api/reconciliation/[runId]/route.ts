import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { requireApiAuth, findReconciliationRunOrError } from "@/lib/api-utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const auth = await requireApiAuth("reconciliation.run");
    if (auth.error) return auth.error;

    const { runId } = await params;
    const runResult = await findReconciliationRunOrError(runId, (id) =>
      db.reconciliationRun.findUnique({
        where: { id },
        include: {
          rows: {
            include: {
              matchedRequest: {
                select: {
                  id: true,
                  status: true,
                  closeReason: true,
                  affiliateOwner: { select: { displayName: true } },
                },
              },
            },
          },
        },
      }),
    );
    if (runResult.error) return runResult.error;
    const run = runResult.run;

    const groupA = run.rows.filter((r) => r.matchedRequestId);
    const groupB = run.rows.filter((r) => !r.matchedRequestId);

    // Group C: Requests that are CLOSED + BOUGHT but not matched
    const matchedRequestIds = new Set(groupA.map((r) => r.matchedRequestId));

    const allBoughtRequests = await db.request.findMany({
      where: {
        platform: run.platform,
        status: "CLOSED",
        closeReason: "BOUGHT",
      },
      select: {
        id: true,
        status: true,
        closeReason: true,
        orderId: true,
        productItemId: true,
        orderAmount: true,
        affiliateOwner: { select: { displayName: true } },
      },
    });

    const groupC = allBoughtRequests.filter((r) => !matchedRequestIds.has(r.id));

    return NextResponse.json({
      ok: true,
      data: {
        run: {
          id: run.id,
          fileName: run.fileName,
          importedAt: run.importedAt,
          platform: run.platform,
          rowCount: run.rowCount,
          matchedCount: run.matchedCount,
        },
        groupA,
        groupB,
        groupC,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching reconciliation run:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ERR_INTERNAL", message: "Internal Server Error" } },
      { status: 500 },
    );
  }
}
