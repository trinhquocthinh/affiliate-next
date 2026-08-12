/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    reconciliationRun: { findUnique: vi.fn() },
    request: { findMany: vi.fn() },
  },
}));

import { auth } from '@/lib/auth';
import { prisma as db } from '@/lib/prisma';

describe('GET /api/reconciliation/[runId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-098: Nên gom đúng 3 nhóm A, B, C và không filter mất trạng thái Đã huỷ', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'admin-1' } });
    (db.user.findUnique as any).mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });

    // Mock run with rows
    (db.reconciliationRun.findUnique as any).mockResolvedValue({
      id: 'RUN-1',
      platform: 'SHOPEE',
      rows: [
        { id: 'ROW-1', matchedRequestId: 'REQ-1', orderStatus: 'Đã hủy' }, // Nhóm A (Đã hủy)
        { id: 'ROW-2', matchedRequestId: null, orderStatus: 'Đã hủy' },    // Nhóm B (Đã hủy)
      ]
    });

    (db.request.findMany as any).mockResolvedValue([
      { id: 'REQ-999', status: 'CLOSED', closeReason: 'BOUGHT' } // Nhóm C
    ]);

    const req = new NextRequest('http://localhost/api/reconciliation/RUN-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'RUN-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.groupA).toHaveLength(1);
    expect(json.data.groupA[0].orderStatus).toBe('Đã hủy'); // TC-098 passed
    expect(json.data.groupB).toHaveLength(1);
    expect(json.data.groupB[0].orderStatus).toBe('Đã hủy');
    expect(json.data.groupC).toHaveLength(1);
  });
});
