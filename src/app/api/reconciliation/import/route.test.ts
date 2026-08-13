import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock auth and db
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    request: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { auth } from '@/lib/auth';
import { prisma as db } from '@/lib/prisma';

describe('POST /api/reconciliation/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-100: Should not modify Request, only reads and inserts ReconciliationRun (Mocked)', async () => {
    (auth as import("vitest").Mock).mockResolvedValue({ user: { id: 'admin-1' } });
    (db.user.findUnique as import("vitest").Mock).mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    (db.request.findMany as import("vitest").Mock).mockResolvedValue([
      { id: 'REQ-1', orderId: 'ORD1', productItemId: 'ITEM1' }
    ]);

    (db.$transaction as import("vitest").Mock).mockImplementation(async (cb: import("vitest").Mock) => {
      return cb({
        reconciliationRun: { create: vi.fn().mockResolvedValue({ id: 'RUN-1' }) },
        reconciliationRow: { createMany: vi.fn().mockResolvedValue({ count: 1 }) }
      });
    });

    const csvData = `ID đơn hàng,Item id,Tên Item,Thời Gian Đặt Hàng,Trạng thái đặt hàng,Trạng thái sản phẩm liên kết,Giá(₫),Giá trị đơn hàng (₫),Hoa hồng ròng tiếp thị liên kết(₫),Sub_id1\nORD1,ITEM1,Item 1,2026-08-10 12:00:00,Hoàn thành,Hoàn thành,100000,100000,10000,REQ-1`;
    
    const formData = new FormData();
    formData.append('file', new File([csvData], 'test.csv', { type: 'text/csv' }));
    formData.append('platform', 'SHOPEE');

    const req = new NextRequest('http://localhost/api/reconciliation/import', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.runId).toBe('RUN-1');

    // Verify it doesn't call update on request
    expect(db.$transaction).toHaveBeenCalled();
  });

  // SPEC-006 kịch bản 13/14 — `reconciliation.run` chỉ dành cho Master/Admin.
  it.each([
    ['AFFILIATE', 403],
    ['BUYER', 403],
    ['AFFILIATE_MASTER', 200],
  ])('vai %s -> %i', async (role, expectedStatus) => {
    (auth as import("vitest").Mock).mockResolvedValue({ user: { id: 'u-1' } });
    (db.user.findUnique as import("vitest").Mock).mockResolvedValue({ id: 'u-1', role });
    (db.request.findMany as import("vitest").Mock).mockResolvedValue([]);
    (db.$transaction as import("vitest").Mock).mockImplementation(async (cb: import("vitest").Mock) =>
      cb({
        reconciliationRun: { create: vi.fn().mockResolvedValue({ id: 'RUN-1' }) },
        reconciliationRow: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
      }),
    );

    const csvData = `ID đơn hàng,Item id,Tên Item,Thời Gian Đặt Hàng,Trạng thái đặt hàng,Trạng thái sản phẩm liên kết,Giá(₫),Giá trị đơn hàng (₫),Hoa hồng ròng tiếp thị liên kết(₫),Sub_id1\nORD1,ITEM1,Item 1,2026-08-10 12:00:00,Hoàn thành,Hoàn thành,100000,100000,10000,REQ-1`;
    const formData = new FormData();
    formData.append('file', new File([csvData], 'test.csv', { type: 'text/csv' }));
    formData.append('platform', 'SHOPEE');

    const res = await POST(
      new NextRequest('http://localhost/api/reconciliation/import', {
        method: 'POST',
        body: formData,
      }),
    );

    expect(res.status).toBe(expectedStatus);
  });
});
