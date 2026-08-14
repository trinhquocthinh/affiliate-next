import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

export type BuyerRequestItem = {
  id: string;
  createdAt: string;
  platform: string;
  productUrlRaw: string;
  productName: string | null;
  affiliateLink: string | null;
  status: string;
  isStale: boolean;
  buyerNote: string | null;
};

type RequestsListResponse = {
  ok: boolean;
  data?: { items: BuyerRequestItem[] };
  error?: { message?: string };
};

export function useBuyerRequests() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const swrKey = (() => {
    const params = new URLSearchParams({ limit: "100" });
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    return `/api/requests?${params.toString()}`;
  })();

  const { data, isLoading, isValidating, mutate } = useSWR<RequestsListResponse>(swrKey);
  const items = data?.ok ? (data.data?.items ?? []) : [];

  function openDetail(item: BuyerRequestItem) {
    setSelectedId(item.id);
  }

  function closeDetail() {
    setSelectedId(null);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied!");
  }

  return {
    statusFilter,
    setStatusFilter,
    items,
    loading: isLoading,
    fetching: isValidating,
    selectedId,
    openDetail,
    closeDetail,
    copyId,
    mutate,
  };
}
