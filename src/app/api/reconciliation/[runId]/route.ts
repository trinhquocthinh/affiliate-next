import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma as db } from '@/lib/prisma';
import { hasPermission } from '@/domain/permissions/resolve';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: { code: 'ERR_UNAUTHENTICATED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'ERR_UNAUTHENTICATED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    if (!hasPermission({ id: user.id, role: user.role }, 'reconciliation.run')) {
      return NextResponse.json(
        { ok: false, error: { code: 'ERR_FORBIDDEN', message: 'Forbidden' } },
        { status: 403 }
      );
    }

    const { runId } = await params;
    const run = await db.reconciliationRun.findUnique({
      where: { id: runId },
      include: {
        rows: {
          include: {
            matchedRequest: {
              select: {
                id: true,
                status: true,
                closeReason: true,
                affiliateOwner: { select: { displayName: true } }
              }
            }
          }
        },
      }
    });

    if (!run) {
      return NextResponse.json(
        { ok: false, error: { code: 'ERR_NOT_FOUND', message: 'Not found' } },
        { status: 404 }
      );
    }

    const groupA = run.rows.filter(r => r.matchedRequestId);
    const groupB = run.rows.filter(r => !r.matchedRequestId);

    // Group C: Requests that are CLOSED + BOUGHT but not matched
    const matchedRequestIds = new Set(groupA.map(r => r.matchedRequestId));
    
    const allBoughtRequests = await db.request.findMany({
      where: {
        platform: run.platform,
        status: 'CLOSED',
        closeReason: 'BOUGHT',
      },
      select: {
        id: true,
        status: true,
        closeReason: true,
        orderId: true,
        productItemId: true,
        orderAmount: true,
        affiliateOwner: { select: { displayName: true } }
      }
    });

    const groupC = allBoughtRequests.filter(r => !matchedRequestIds.has(r.id));

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
        groupC
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching reconciliation run:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'ERR_INTERNAL', message: 'Internal Server Error' } },
      { status: 500 }
    );
  }
}
