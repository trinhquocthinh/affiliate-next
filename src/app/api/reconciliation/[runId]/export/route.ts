import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma as db } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // TODO(Epic 5): Khi hệ thống Permission hoàn thiện, gỡ bỏ hardcode 'AFFILIATE'.
    if (user.role !== 'ADMIN' && user.role !== 'AFFILIATE') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { runId } = await params;
    const run = await db.reconciliationRun.findUnique({
      where: { id: runId },
      include: {
        rows: {
          include: {
            matchedRequest: {
              select: { id: true }
            }
          },
          orderBy: { orderedAt: 'desc' }
        },
      }
    });

    if (!run) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Build CSV
    const headers = [
      'ID đơn hàng',
      'Item id',
      'Tên Item',
      'Thời Gian Đặt Hàng',
      'Trạng thái đặt hàng',
      'Trạng thái sản phẩm liên kết',
      'Giá(₫)',
      'Giá trị đơn hàng (₫)',
      'Hoa hồng ròng tiếp thị liên kết(₫)',
      'Sub_id1',
      'Mã Yêu Cầu Ghép Được',
      'Phương Pháp Ghép'
    ];

    const csvRows = [headers.join(',')];

    const escapeCSV = (field: any): string => {
      if (field === null || field === undefined) return '';
      let str = String(field);
      if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    for (const row of run.rows) {
      const line = [
        escapeCSV(row.orderId),
        escapeCSV(row.itemId),
        escapeCSV(row.itemName),
        escapeCSV(row.orderedAt.toISOString()),
        escapeCSV(row.orderStatus),
        escapeCSV(row.affiliateStatus),
        row.price.toString(), // No escape for numeric fields so Excel recognizes them
        row.orderValue.toString(),
        row.netCommission.toString(),
        escapeCSV(row.subId1),
        escapeCSV(row.matchedRequest?.id),
        escapeCSV(row.matchMethod)
      ];
      csvRows.push(line.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reconciliation_${runId}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting reconciliation run:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
