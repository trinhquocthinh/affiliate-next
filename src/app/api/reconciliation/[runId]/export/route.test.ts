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
  },
}));

import { auth } from '@/lib/auth';
import { prisma as db } from '@/lib/prisma';

describe('GET /api/reconciliation/[runId]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Nên export CSV hợp lệ, chống injection và số không bị quote', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'admin-1' } });
    (db.user.findUnique as any).mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });

    (db.reconciliationRun.findUnique as any).mockResolvedValue({
      id: 'RUN-1',
      rows: [
        {
          orderId: '=cmd|/c', // Injection test
          itemId: '@evil',   // Injection test
          itemName: 'Item "Cool"', // Quote escaping
          orderedAt: new Date('2026-08-10T12:00:00Z'),
          orderStatus: 'Hoàn thành',
          affiliateStatus: 'Hoàn thành',
          price: 100000,     // Numbers should not be quoted
          orderValue: 100000,
          netCommission: 10000,
          subId1: '+sum',    // Injection test
          matchedRequest: { id: 'REQ-1' },
          matchMethod: 'SUB_ID'
        }
      ]
    });

    const req = new NextRequest('http://localhost/api/reconciliation/RUN-1/export');
    const res = await GET(req, { params: Promise.resolve({ runId: 'RUN-1' }) });
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');

    const lines = text.split('\n');
    const dataLine = lines[1];

    // =cmd|/c -> "'=cmd|/c"
    expect(dataLine).toContain('"' + "'=cmd|/c" + '"');
    expect(dataLine).toContain('"' + "'@evil" + '"');
    // Item "Cool" -> "Item ""Cool"""
    expect(dataLine).toContain('"Item ""Cool"""');
    // Numbers without quotes
    expect(dataLine).toContain(',100000,100000,10000,');
    expect(dataLine).toContain('"' + "'+sum" + '"');
  });

  // SPEC-006 kịch bản 13 — `reconciliation.export` chỉ dành cho Master/Admin.
  it.each([
    ['AFFILIATE', 403],
    ['BUYER', 403],
    ['AFFILIATE_MASTER', 200],
  ])('vai %s -> %i', async (role, expectedStatus) => {
    (auth as any).mockResolvedValue({ user: { id: 'u-1' } });
    (db.user.findUnique as any).mockResolvedValue({ id: 'u-1', role });
    (db.reconciliationRun.findUnique as any).mockResolvedValue({ id: 'RUN-1', rows: [] });

    const res = await GET(new NextRequest('http://localhost/api/reconciliation/RUN-1/export'), {
      params: Promise.resolve({ runId: 'RUN-1' }),
    });

    expect(res.status).toBe(expectedStatus);
  });
});
