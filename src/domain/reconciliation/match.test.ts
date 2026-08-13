import { describe, it, expect } from 'vitest';
import { matchReportRows, RequestData } from './match';
import { CommissionRow } from './parse-report';

describe('matchReportRows', () => {
  const createMockRow = (overrides: Partial<CommissionRow>): CommissionRow => ({
    orderId: 'ORD1',
    itemId: 'ITEM1',
    itemName: 'Item 1',
    orderedAt: '2026-08-10',
    orderStatus: 'Hoàn thành',
    affiliateStatus: 'Hoàn thành',
    price: '100000',
    orderValue: '100000',
    netCommission: '10000',
    subId1: '',
    ...overrides,
  });

  it('TC-093: Ghép theo Sub_id1', () => {
    const rows = [createMockRow({ subId1: 'REQ-1' })];
    const requests: RequestData[] = [{ id: 'REQ-1', orderId: null, productItemId: null }];

    const result = matchReportRows(rows, requests);
    expect(result.matchedRows[0].matchMethod).toBe('SUB_ID');
    expect(result.matchedRows[0].matchedRequestId).toBe('REQ-1');
    expect(result.unmatchedRequests).toHaveLength(0);
  });

  it('TC-094: Sub_id1 trỏ mã không tồn tại, rơi vào nhóm NONE', () => {
    const rows = [createMockRow({ subId1: 'REQ-999' })];
    const requests: RequestData[] = [{ id: 'REQ-1', orderId: null, productItemId: null }];

    const result = matchReportRows(rows, requests);
    expect(result.matchedRows[0].matchMethod).toBe('NONE');
    expect(result.matchedRows[0].matchedRequestId).toBeNull();
  });

  it('TC-095: Ghép theo cặp orderId + itemId', () => {
    const rows = [createMockRow({ orderId: 'ORD1', itemId: 'ITEM1', subId1: '' })];
    const requests: RequestData[] = [{ id: 'REQ-1', orderId: 'ORD1', productItemId: 'ITEM1' }];

    const result = matchReportRows(rows, requests);
    expect(result.matchedRows[0].matchMethod).toBe('ORDER_ITEM');
    expect(result.matchedRows[0].matchedRequestId).toBe('REQ-1');
  });

  it('TC-096: 1 mã đơn 3 dòng, 1 khớp -> 1 vào A (ORDER_ITEM), 2 vào B (NONE)', () => {
    const rows = [
      createMockRow({ orderId: 'ORD1', itemId: 'ITEM1' }),
      createMockRow({ orderId: 'ORD1', itemId: 'ITEM2' }),
      createMockRow({ orderId: 'ORD1', itemId: 'ITEM3' }),
    ];
    const requests: RequestData[] = [{ id: 'REQ-1', orderId: 'ORD1', productItemId: 'ITEM1' }];

    const result = matchReportRows(rows, requests);
    expect(result.matchedRows).toHaveLength(3);
    expect(result.matchedRows[0].matchMethod).toBe('ORDER_ITEM');
    expect(result.matchedRows[1].matchMethod).toBe('NONE');
    expect(result.matchedRows[2].matchMethod).toBe('NONE');
    expect(result.unmatchedRequests).toHaveLength(0);
  });

  it('TC-097: Yêu cầu BOUGHT không có dòng báo cáo (rơi vào nhóm unmatchedRequests)', () => {
    const rows = [createMockRow({ orderId: 'ORD999', itemId: 'ITEM999' })];
    const requests: RequestData[] = [
      { id: 'REQ-1', orderId: 'ORD1', productItemId: 'ITEM1' },
      { id: 'REQ-2', orderId: 'ORD2', productItemId: 'ITEM2' }
    ];

    const result = matchReportRows(rows, requests);
    expect(result.matchedRows[0].matchMethod).toBe('NONE');
    expect(result.unmatchedRequests).toHaveLength(2);
    expect(result.unmatchedRequests.map(r => r.id)).toEqual(['REQ-1', 'REQ-2']);
  });

  it('TC-103: Hai dòng báo cáo trùng cùng Sub_id1 (trỏ 1 Request), chỉ dòng đầu khớp SUB_ID', () => {
    const rows = [
      createMockRow({ subId1: 'REQ-1' }), // Dòng 1
      createMockRow({ subId1: 'REQ-1' })  // Dòng 2 trùng Sub_id
    ];
    const requests: RequestData[] = [{ id: 'REQ-1', orderId: null, productItemId: null }];

    const result = matchReportRows(rows, requests);
    expect(result.matchedRows[0].matchMethod).toBe('SUB_ID');
    expect(result.matchedRows[0].matchedRequestId).toBe('REQ-1');
    expect(result.matchedRows[1].matchMethod).toBe('NONE');
    expect(result.matchedRows[1].matchedRequestId).toBeNull();
  });
});
