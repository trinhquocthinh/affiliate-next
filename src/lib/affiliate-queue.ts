export type QueueItem = {
  id: string;
  createdAt: string;
  platform: string;
  productUrlRaw: string;
  productName: string | null;
  affiliateLink: string | null;
  status: string;
  closeReason: string | null;
  orderId: string | null;
  notes: string | null;
  isStale: boolean;
  ageHours: number;
  isClaimed: boolean;
  isOwnedByMe: boolean;
  hasPotentialDuplicate: boolean;
  lastUpdatedAt: string;
  duplicateOfId: string | null;
  createdBy: { displayName: string | null; email: string };
  affiliateOwner: { displayName: string | null; email: string } | null;
};

export type QueueSummary = {
  total: number;
  staleCount: number;
  processedCount: number;
};

export type BuyerOption = {
  id: string;
  displayName: string | null;
  email: string;
};

export type QueueResponse = {
  ok: boolean;
  data?: {
    items: QueueItem[];
    total: number;
    totalPages: number;
    summary: QueueSummary;
    buyers?: BuyerOption[];
  };
  error?: { message?: string };
};

export const PAGE_SIZE = 20;

// Compact badge styling shared by the desktop table cells
// (affiliate-queue-cells.tsx) and the mobile card list, kept visually denser
// than the shadcn <Badge>-based StatusBadge/PlatformBadge used in dialogs.
export const QUEUE_STATUS_BADGE_STYLES: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  FILLED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
};

export const QUEUE_PLATFORM_STYLES: Record<string, string> = {
  SHOPEE: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  TIKTOK: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  OTHER: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
};

export const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Created: Newest first" },
  { value: "createdAt:asc", label: "Created: Oldest first" },
  { value: "lastUpdatedAt:desc", label: "Updated: Newest first" },
  { value: "lastUpdatedAt:asc", label: "Updated: Oldest first" },
] as const;

export type AffiliateQueueFilters = {
  search: string;
  statusFilter: string;
  buyerFilter: string;
  sortBy: string;
  sortOrder: string;
  createdFrom: string;
  createdTo: string;
};

/**
 * Build the query string shared by the paginated queue fetch, the mobile
 * infinite-scroll loader, and the CSV export loop, so all three stay in sync
 * with the same filter set. `pageSize` defaults to the on-screen page size but
 * the CSV export uses a larger batch size to reduce round-trips.
 */
export function buildQueueParams(
  filters: AffiliateQueueFilters,
  page: number,
  pageSize: number = PAGE_SIZE,
): URLSearchParams {
  const { search, statusFilter, buyerFilter, sortBy, sortOrder, createdFrom, createdTo } = filters;
  const params = new URLSearchParams({
    statusFilter,
    sortBy,
    sortOrder,
    limit: String(pageSize),
    page: String(page),
  });
  if (search.trim()) params.set("search", search.trim());
  if (buyerFilter !== "ALL") params.set("buyerId", buyerFilter);
  if (createdFrom) params.set("createdFrom", createdFrom);
  if (createdTo) params.set("createdTo", createdTo);
  return params;
}

/**
 * Build a CSV string (UTF-8 BOM + comma-separated, double-quote escaped)
 * from headers and row values. Pure string building only — no Blob/DOM APIs
 * so it can be unit tested without a browser environment.
 */
export function buildCsvContent(headers: string[], rows: string[][]): string {
  return (
    "﻿" +
    [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n")
  );
}
