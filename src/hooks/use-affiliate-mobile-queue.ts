import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/swr-fetcher";
import {
  buildQueueParams,
  type AffiliateQueueFilters,
  type QueueItem,
  type QueueResponse,
} from "@/lib/affiliate-queue";

/**
 * Mobile infinite-scroll accumulator. Deliberately kept separate from the
 * desktop SWR-paginated state in `use-affiliate-queue.ts` (dual pagination is
 * an existing, intentional design) — it takes the resolved `filters` object
 * from that hook instead of re-deriving filter state, so both stay in sync
 * off one source of truth without duplicating the URL/search-param logic.
 */
export function useAffiliateMobileQueue({
  filters,
  desktopLoading,
  desktopItems,
  desktopPage,
  desktopTotalPages,
}: {
  filters: AffiliateQueueFilters;
  desktopLoading: boolean;
  desktopItems: QueueItem[];
  desktopPage: number;
  desktopTotalPages: number;
}) {
  const [mobileItems, setMobileItems] = useState<QueueItem[]>([]);
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileHasMore, setMobileHasMore] = useState(true);
  const [mobileLoadingMore, setMobileLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset the accumulator whenever the filters change (same trigger as the
  // desktop hook's page reset).
  useEffect(() => {
    setMobilePage(1);
    setMobileItems([]);
    setMobileHasMore(true);
  }, [filters]);

  // Sync first page from the desktop fetch so mobile doesn't duplicate the
  // initial request.
  useEffect(() => {
    if (!desktopLoading && desktopItems.length > 0 && mobilePage === 1) {
      setMobileItems(desktopItems);
      setMobileHasMore(desktopPage < desktopTotalPages);
    }
  }, [desktopLoading, desktopItems, mobilePage, desktopPage, desktopTotalPages]);

  const loadMoreMobile = useCallback(async () => {
    if (mobileLoadingMore || !mobileHasMore) return;
    const nextPage = mobilePage + 1;
    setMobileLoadingMore(true);
    try {
      const params = buildQueueParams(filters, nextPage);
      const data = await apiFetch<QueueResponse>(`/api/affiliate/queue?${params}`);
      if (data.ok && data.data) {
        setMobileItems((prev) => [...prev, ...data.data!.items]);
        setMobilePage(nextPage);
        setMobileHasMore(nextPage < data.data.totalPages);
      }
    } catch {
      // silent
    } finally {
      setMobileLoadingMore(false);
    }
  }, [mobileLoadingMore, mobileHasMore, mobilePage, filters]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreMobile();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreMobile]);

  return { mobileItems, mobileHasMore, mobileLoadingMore, sentinelRef };
}
