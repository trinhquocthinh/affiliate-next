import { useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/swr-fetcher";
import { AFFILIATE_COLUMNS, parseAllowedColumns, type AffiliateColumnId } from "@/lib/affiliate-columns";

/**
 * Admin-side toggle for which affiliate-queue columns are allowed at all
 * (distinct from `use-affiliate-columns.ts`, which manages one user's own
 * visibility/order preferences within that allowed set).
 */
export function useAffiliateAllowedColumns({
  remoteValue,
  mutate,
}: {
  remoteValue: string | undefined;
  mutate: () => void;
}) {
  const initialAllowedColumns = useMemo(
    () => new Set<AffiliateColumnId>(parseAllowedColumns(remoteValue)),
    [remoteValue],
  );
  const [allowedColumns, setAllowedColumns] = useState<Set<AffiliateColumnId>>(initialAllowedColumns);
  const [columnsDirty, setColumnsDirty] = useState(false);
  const [savingColumns, setSavingColumns] = useState(false);

  // Re-sync local state when the server value changes (e.g., first load),
  // unless the admin has pending unsaved edits. Adjusted during render
  // (comparing against the last-seen inputs) rather than in an effect, per
  // React's documented pattern for resetting state when a value changes.
  const [prevInitial, setPrevInitial] = useState(initialAllowedColumns);
  const [prevDirty, setPrevDirty] = useState(columnsDirty);
  if (initialAllowedColumns !== prevInitial || columnsDirty !== prevDirty) {
    setPrevInitial(initialAllowedColumns);
    setPrevDirty(columnsDirty);
    if (!columnsDirty) {
      setAllowedColumns(initialAllowedColumns);
    }
  }

  function toggleColumn(id: AffiliateColumnId, checked: boolean) {
    setColumnsDirty(true);
    setAllowedColumns((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function saveAllowedColumns() {
    const value = JSON.stringify(
      AFFILIATE_COLUMNS.filter((c) => allowedColumns.has(c.id) || c.mandatory).map((c) => c.id),
    );
    setSavingColumns(true);
    try {
      const res = await apiFetch<{ ok: boolean; error?: { message?: string } }>("/api/config", {
        method: "PUT",
        body: JSON.stringify({ key: "AFFILIATE_ALLOWED_COLUMNS", value }),
      });
      if (res.ok) {
        toast.success("Affiliate columns updated");
        setColumnsDirty(false);
        mutate();
      } else {
        toast.error(res.error?.message || "Failed to save");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingColumns(false);
    }
  }

  return {
    allowedColumns,
    columnsDirty,
    savingColumns,
    toggleColumn,
    saveAllowedColumns,
  };
}
