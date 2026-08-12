import { describe, it, expect } from 'vitest';
import { parseCommissionReport } from './parse-report';

describe('parseCommissionReport', () => {
  it('TC-099: Cột lạ ngoài 47 cột được bỏ qua, parse thành công', () => {
    const csvContent = `ID đơn hàng,Item id,Tên Item,Thời Gian Đặt Hàng,Trạng thái đặt hàng,Trạng thái sản phẩm liên kết,Giá(₫),Giá trị đơn hàng (₫),Hoa hồng ròng tiếp thị liên kết(₫),Sub_id1,Cột lạ 1,Cột lạ 2\n` +
      `260810124VEV6B,123456,Sản phẩm 1,2026-08-10 12:00:00,Hoàn thành,Hoàn thành,100000,100000,10000,REQ-1,Bỏ qua 1,Bỏ qua 2`;

    const result = parseCommissionReport(csvContent);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      orderId: '260810124VEV6B',
      itemId: '123456',
      itemName: 'Sản phẩm 1',
      orderedAt: '2026-08-10 12:00:00',
      orderStatus: 'Hoàn thành',
      affiliateStatus: 'Hoàn thành',
      price: '100000',
      orderValue: '100000',
      netCommission: '10000',
      subId1: 'REQ-1',
    });
  });

  it('TC-101: Thiếu cột ID đơn hàng sẽ ném lỗi ERR_REPORT_FORMAT', () => {
    const csvContent = `Item id,Tên Item,Thời Gian Đặt Hàng,Trạng thái đặt hàng,Trạng thái sản phẩm liên kết,Giá(₫),Giá trị đơn hàng (₫),Hoa hồng ròng tiếp thị liên kết(₫),Sub_id1\n` +
      `123456,Sản phẩm 1,2026-08-10 12:00:00,Hoàn thành,Hoàn thành,100000,100000,10000,REQ-1`;

    expect(() => parseCommissionReport(csvContent)).toThrowError('ERR_REPORT_FORMAT: Thiếu cột "ID đơn hàng"');
  });

  it('Bỏ qua dòng rỗng hoặc dòng không có ID đơn hàng', () => {
    const csvContent = `ID đơn hàng,Item id,Tên Item,Thời Gian Đặt Hàng,Trạng thái đặt hàng,Trạng thái sản phẩm liên kết,Giá(₫),Giá trị đơn hàng (₫),Hoa hồng ròng tiếp thị liên kết(₫),Sub_id1\n` +
      `260810124VEV6B,123456,Sản phẩm 1,2026-08-10 12:00:00,Hoàn thành,Hoàn thành,100000,100000,10000,REQ-1\n` +
      `\n` +
      `,123457,Sản phẩm 2,2026-08-10 12:00:00,Hoàn thành,Hoàn thành,200000,200000,20000,REQ-2\n`;

    const result = parseCommissionReport(csvContent);
    expect(result).toHaveLength(1);
    expect(result[0].orderId).toBe('260810124VEV6B');
  });

  it('Hỗ trợ BOM', () => {
    const csvContent = '\uFEFF' + `ID đơn hàng,Item id,Tên Item,Thời Gian Đặt Hàng,Trạng thái đặt hàng,Trạng thái sản phẩm liên kết,Giá(₫),Giá trị đơn hàng (₫),Hoa hồng ròng tiếp thị liên kết(₫),Sub_id1\n` +
      `260810124VEV6B,123456,Sản phẩm 1,2026-08-10 12:00:00,Hoàn thành,Hoàn thành,100000,100000,10000,REQ-1`;

    const result = parseCommissionReport(csvContent);
    expect(result).toHaveLength(1);
    expect(result[0].orderId).toBe('260810124VEV6B');
  });
});
