import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/swr-fetcher";
import {
  affiliateColumnValue,
  type AffiliateQueueRow,
} from "@/components/dashboard/affiliate-queue-cells";
import type { EffectiveColumn } from "@/lib/affiliate-columns";
import {
  buildCsvContent,
  buildQueueParams,
  type AffiliateQueueFilters,
  type QueueItem,
  type QueueResponse,
} from "@/lib/affiliate-queue";

const EXPORT_PAGE_SIZE = 100;

/**
 * CSV export intentionally re-fetches every page via `apiFetch` directly
 * (bypassing the SWR cache) since it's a one-shot user-triggered action, not
 * cached list state — it must not be routed through the paginated queue's
 * SWR key.
 */
export function useAffiliateCsvExport(
  filters: AffiliateQueueFilters,
  visibleColumns: EffectiveColumn[],
) {
  const [exporting, setExporting] = useState(false);

  async function handleExportCSV() {
    if (visibleColumns.length === 0) {
      toast.error("Enable at least one column before exporting");
      return;
    }
    setExporting(true);
    try {
      let allItems: QueueItem[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params = buildQueueParams(filters, currentPage, EXPORT_PAGE_SIZE);
        const data = await apiFetch<QueueResponse>(`/api/affiliate/queue?${params}`);
        if (!data.ok || !data.data) {
          toast.error("Failed to export");
          return;
        }
        allItems = [...allItems, ...data.data.items];
        hasMore = currentPage < data.data.totalPages;
        currentPage++;
      }

      // WYSIWYG: headers + row values are derived from the user's current
      // visible-column order. Hidden / disallowed columns are excluded.
      const headers = visibleColumns.map((c) => c.label);
      const rows = allItems.map((item) =>
        visibleColumns.map((c) => affiliateColumnValue(item as AffiliateQueueRow, c.id)),
      );

      const csvContent = buildCsvContent(headers, rows);

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `affiliate-queue-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported successfully");
    } catch {
      toast.error("Failed to export");
    } finally {
      setExporting(false);
    }
  }

  return { exporting, handleExportCSV };
}
