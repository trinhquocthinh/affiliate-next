import { CommissionRow } from "./parse-report";

type MatchMethod = "SUB_ID" | "ORDER_ITEM" | "NONE";

export interface MatchedResult {
  row: CommissionRow;
  matchedRequestId: string | null;
  matchMethod: MatchMethod;
}

export interface RequestData {
  id: string;
  orderId: string | null;
  productItemId: string | null;
}

export function matchReportRows(
  rows: CommissionRow[],
  activeRequests: RequestData[],
): { matchedRows: MatchedResult[]; unmatchedRequests: RequestData[] } {
  const results: MatchedResult[] = [];
  const matchedRequestIds = new Set<string>();

  const requestsById = new Map<string, RequestData>();
  const requestsByOrderItem = new Map<string, RequestData[]>();

  for (const req of activeRequests) {
    requestsById.set(req.id, req);
    if (req.orderId && req.productItemId) {
      const key = `${req.orderId}_${req.productItemId}`;
      const list = requestsByOrderItem.get(key) || [];
      list.push(req);
      requestsByOrderItem.set(key, list);
    }
  }

  // Pass 1: Match by SUB_ID
  for (const row of rows) {
    let matchedId: string | null = null;
    let method: MatchMethod = "NONE";

    if (row.subId1) {
      const req = requestsById.get(row.subId1);
      if (req && !matchedRequestIds.has(req.id)) {
        matchedId = req.id;
        method = "SUB_ID";
      }
    }

    results.push({ row, matchedRequestId: matchedId, matchMethod: method });
    if (matchedId) matchedRequestIds.add(matchedId);
  }

  // Pass 2: Match by orderId + productItemId (only for those unmatched and available)
  for (const result of results) {
    if (result.matchMethod === "NONE") {
      const key = `${result.row.orderId}_${result.row.itemId}`;
      const reqList = requestsByOrderItem.get(key);
      if (reqList) {
        const req = reqList.find((r) => !matchedRequestIds.has(r.id));
        if (req) {
          result.matchedRequestId = req.id;
          result.matchMethod = "ORDER_ITEM";
          matchedRequestIds.add(req.id);
        }
      }
    }
  }

  const unmatchedRequests = activeRequests.filter((r) => !matchedRequestIds.has(r.id));

  return {
    matchedRows: results,
    unmatchedRequests,
  };
}
