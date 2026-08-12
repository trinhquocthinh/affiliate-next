export interface CommissionRow {
  orderId: string;
  itemId: string;
  itemName: string;
  orderedAt: string;
  orderStatus: string;
  affiliateStatus: string;
  price: string;
  orderValue: string;
  netCommission: string;
  subId1: string;
}

export function parseCommissionReport(csvContent: string): CommissionRow[] {
  // Loại bỏ BOM nếu có
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
  }

  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('ERR_REPORT_FORMAT');
  }

  const headerRow = parseCSVLine(lines[0]);

  const columnIndices: Record<string, number> = {};

  const columnMapping: Record<string, string[]> = {
    orderId: ['id đơn hàng', 'idđơnhàng', 'orderid'],
    itemId: ['item id', 'itemid', 'productid'],
    itemName: ['tên item', 'tênitem', 'itemname', 'productname'],
    orderedAt: ['thời gian đặt hàng', 'thờigianđặthàng', 'ordertime', 'orderedat'],
    orderStatus: ['trạng thái đặt hàng', 'trạngtháiđặthàng', 'orderstatus'],
    affiliateStatus: [
      'trạng thái sản phẩm liên kết',
      'trạngtháisảnphẩmliênkết',
      'affiliatestatus',
    ],
    price: ['giá(₫)', 'giá (₫)', 'giá(đ)', 'giá (đ)', 'price'],
    orderValue: [
      'giá trị đơn hàng (₫)',
      'giá trị đơn hàng(₫)',
      'giá trị đơn hàng (đ)',
      'giátrịđơnhàng(₫)',
      'ordervalue',
    ],
    netCommission: [
      'hoa hồng ròng tiếp thị liên kết(₫)',
      'hoa hồng ròng tiếp thị liên kết (₫)',
      'hoahồngròngtiếpthịliênkết(₫)',
      'netcommission',
    ],
    subId1: ['sub_id1', 'subid1'],
  };

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s/g, '');
  const normalizedHeaders = headerRow.map(normalize);

  for (const [key, possibleNames] of Object.entries(columnMapping)) {
    let index = -1;
    for (const name of possibleNames) {
      index = normalizedHeaders.indexOf(normalize(name));
      if (index !== -1) break;
    }
    columnIndices[key] = index;
  }

  const requiredColumns = [
    { key: 'orderId', name: 'ID đơn hàng' }
  ];

  for (const reqCol of requiredColumns) {
    if (columnIndices[reqCol.key] === -1) {
      throw new Error(`ERR_REPORT_FORMAT: Thiếu cột "${reqCol.name}"`);
    }
  }

  const results: CommissionRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < headerRow.length && fields.join('').trim() === '') continue;

    const orderId = getField(fields, columnIndices['orderId']);
    if (!orderId) continue;

    results.push({
      orderId,
      itemId: getField(fields, columnIndices['itemId']),
      itemName: getField(fields, columnIndices['itemName']),
      orderedAt: getField(fields, columnIndices['orderedAt']),
      orderStatus: getField(fields, columnIndices['orderStatus']),
      affiliateStatus: getField(fields, columnIndices['affiliateStatus']),
      price: getField(fields, columnIndices['price']),
      orderValue: getField(fields, columnIndices['orderValue']),
      netCommission: getField(fields, columnIndices['netCommission']),
      subId1: getField(fields, columnIndices['subId1']),
    });
  }

  return results;
}

function getField(fields: string[], index: number): string {
  if (index === -1 || index >= fields.length) return '';
  return fields[index].trim();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
