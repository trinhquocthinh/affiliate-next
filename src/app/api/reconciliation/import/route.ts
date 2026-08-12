import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma as db } from '@/lib/prisma';
import { parseCommissionReport } from '@/domain/reconciliation/parse-report';
import { matchReportRows } from '@/domain/reconciliation/match';
type PlatformEnum = 'SHOPEE' | 'TIKTOK' | 'OTHER';

export async function POST(req: NextRequest) {
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

    // TODO(Epic 5): Khi hệ thống Permission hoàn thiện, gỡ bỏ hardcode 'AFFILIATE'. 
    // Hiện tại tạm cho phép AFFILIATE dùng để test. Theo matrix thì chỉ AffiliateMaster/Admin được dùng.
    if (user.role !== 'ADMIN' && user.role !== 'AFFILIATE') {
      return NextResponse.json(
        { ok: false, error: { code: 'ERR_FORBIDDEN', message: 'Forbidden' } },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const platform = formData.get('platform') as string;

    if (!file || !platform || !['SHOPEE', 'TIKTOK', 'OTHER'].includes(platform)) {
      return NextResponse.json(
        { ok: false, error: { code: 'ERR_BAD_REQUEST', message: 'Invalid input' } },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json(
        { ok: false, error: { code: 'ERR_FILE_TOO_LARGE', message: 'File quá lớn (tối đa 5MB)' } },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    let rows;
    try {
      rows = parseCommissionReport(csvContent);
    } catch (err: any) {
      if (err.message?.startsWith('ERR_REPORT_FORMAT')) {
        return NextResponse.json(
          { ok: false, error: { code: 'ERR_REPORT_FORMAT', message: err.message.replace('ERR_REPORT_FORMAT: ', '') } },
          { status: 400 }
        );
      }
      throw err;
    }

    // Load active requests for this platform
    const activeRequests = await db.request.findMany({
      where: {
        platform: platform as PlatformEnum,
      },
      select: {
        id: true,
        orderId: true,
        productItemId: true,
      },
    });

    const { matchedRows, unmatchedRequests } = matchReportRows(rows, activeRequests);

    // Save to DB
    const run = await db.$transaction(async (tx) => {
      const run = await tx.reconciliationRun.create({
        data: {
          platform: platform as PlatformEnum,
          fileName: file.name,
          importedById: user.id,
          rowCount: rows.length,
          matchedCount: matchedRows.filter((r) => r.matchedRequestId).length,
        },
      });

      // Batch insert rows
      const cleanRowData = matchedRows.map((m) => {
        let dt = new Date();
        const parsed = new Date(m.row.orderedAt.replace(' ', 'T') + '+07:00');
        if (isNaN(parsed.getTime())) {
          throw new Error(`Lỗi định dạng ngày tại đơn ${m.row.orderId}: ${m.row.orderedAt}`);
        } else {
          dt = parsed;
        }

        return {
          runId: run.id,
          orderId: m.row.orderId,
          itemId: m.row.itemId,
          itemName: m.row.itemName.slice(0, 255),
          orderedAt: dt,
          orderStatus: m.row.orderStatus,
          affiliateStatus: m.row.affiliateStatus,
          price: parseFloat(m.row.price.replace(/,/g, '')) || 0,
          orderValue: parseFloat(m.row.orderValue.replace(/,/g, '')) || 0,
          netCommission: parseFloat(m.row.netCommission.replace(/,/g, '')) || 0,
          subId1: m.row.subId1,
          matchedRequestId: m.matchedRequestId,
          matchMethod: m.matchMethod,
        };
      });

      await tx.reconciliationRow.createMany({
        data: cleanRowData,
      });

      return run;
    });

    return NextResponse.json({ ok: true, data: { runId: run.id } });
  } catch (error: any) {
    console.error('Error importing report:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'ERR_INTERNAL', message: 'Internal Server Error' } },
      { status: 500 }
    );
  }
}
