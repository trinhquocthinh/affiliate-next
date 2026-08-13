import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  buildQueueParams,
  PAGE_SIZE,
  type AffiliateQueueFilters,
  type BuyerOption,
  type QueueResponse,
  type QueueSummary,
} from "@/lib/affiliate-queue";

const EMPTY_SUMMARY: QueueSummary = { total: 0, staleCount: 0, processedCount: 0 };

export function useAffiliateQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Pagination state
  const [page, setPage] = useState(1);
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);

  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL");
  const [buyerFilter, setBuyerFilter] = useState(searchParams.get("buyer") || "ALL");
  const [sortValue, setSortValue] = useState(
    searchParams.get("sortBy")
      ? `${searchParams.get("sortBy")}:${searchParams.get("sortOrder")}`
      : "createdAt:desc",
  );
  const [createdFrom, setCreatedFrom] = useState(searchParams.get("createdFrom") || "");
  const [createdTo, setCreatedTo] = useState(searchParams.get("createdTo") || "");

  function setDateRange(from: string, to: string) {
    setCreatedFrom(from);
    setCreatedTo(to);
  }

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (buyerFilter !== "ALL") params.set("buyer", buyerFilter);

    const [by, order] = sortValue.split(":");
    if (by && order) {
      params.set("sortBy", by);
      params.set("sortOrder", order);
    }

    if (createdFrom) params.set("createdFrom", createdFrom);
    if (createdTo) params.set("createdTo", createdTo);

    const newQuery = params.toString();
    const currentQuery = window.location.search.replace(/^\?/, "");

    if (newQuery !== currentQuery) {
      router.replace(`${pathname}${newQuery ? `?${newQuery}` : ""}`, { scroll: false });
    }
  }, [debouncedSearch, statusFilter, buyerFilter, sortValue, createdFrom, createdTo, pathname, router]);

  const [sortBy, sortOrder] = sortValue.split(":") as [string, string];

  const filters: AffiliateQueueFilters = useMemo(
    () => ({ search: debouncedSearch, statusFilter, buyerFilter, sortBy, sortOrder, createdFrom, createdTo }),
    [debouncedSearch, statusFilter, buyerFilter, sortBy, sortOrder, createdFrom, createdTo],
  );

  // Reset page when filters change. Adjusted during render (not in an
  // effect) per React's documented pattern for resetting state when a value
  // changes — avoids an extra commit/paint cycle.
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setPage(1);
  }

  // Desktop fetch via SWR
  const swrKey = `/api/affiliate/queue?${buildQueueParams(filters, page).toString()}`;
  const { data: swrData, isLoading, isValidating, mutate } = useSWR<QueueResponse>(swrKey);
  const items = useMemo(() => (swrData?.ok ? swrData.data?.items ?? [] : []), [swrData]);
  const total = swrData?.ok ? swrData.data?.total ?? 0 : 0;
  const summary: QueueSummary = swrData?.ok ? swrData.data?.summary ?? EMPTY_SUMMARY : EMPTY_SUMMARY;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const loading = isLoading;
  const fetching = isValidating;

  // Sync buyers from SWR response — a "sticky" mirror that only
  // updates on truthy values and otherwise keeps the last known ones, so it's
  // adjusted during render (comparing against the last-seen swrData) rather
  // than in an effect.
  const [prevSwrData, setPrevSwrData] = useState(swrData);
  if (swrData !== prevSwrData) {
    setPrevSwrData(swrData);
    if (swrData?.ok && swrData.data) {
      if (swrData.data.buyers) setBuyers(swrData.data.buyers);
    }
  }

  const fetchQueue = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    buyerFilter,
    setBuyerFilter,
    sortValue,
    setSortValue,
    createdFrom,
    createdTo,
    setDateRange,
    filters,
    items,
    total,
    summary,
    totalPages,
    loading,
    fetching,
    buyers,
    fetchQueue,
  };
}
