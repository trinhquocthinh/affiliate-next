"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";
import { apiFetch } from "@/lib/swr-fetcher";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAffiliateColumns } from "@/hooks/use-affiliate-columns";
import {
  affiliateColumnValue,
  renderAffiliateCell,
  type AffiliateQueueRow,
} from "@/components/dashboard/affiliate-queue-cells";
import type { AffiliateColumnId } from "@/lib/affiliate-columns";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  InboxIcon,
  AlertTriangleIcon,
  UserIcon,
  SearchIcon,
  ExternalLinkIcon,
  CopyIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
  Link2Icon,
  Columns3Icon,
  GripVerticalIcon,
} from "lucide-react";
import {
  TooltipProvider,
  InfoTooltip,
} from "@/components/ui/tooltip";

type QueueItem = {
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

type Summary = {
  total: number;
  staleCount: number;
  processedCount: number;
};

type BuyerOption = {
  id: string;
  displayName: string | null;
  email: string;
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  FILLED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
};

const PLATFORM_STYLES: Record<string, string> = {
  SHOPEE: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  TIKTOK: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  OTHER: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
};

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Created: Newest first" },
  { value: "createdAt:asc", label: "Created: Oldest first" },
  { value: "lastUpdatedAt:desc", label: "Updated: Newest first" },
  { value: "lastUpdatedAt:asc", label: "Updated: Oldest first" },
];

function statusLabel(status: string) {
  if (status === "NEW") return "Pending";
  if (status === "FILLED") return "Ready";
  return "Closed";
}

const PAGE_SIZE = 20;

type QueueResponse = {
  ok: boolean;
  data?: {
    items: QueueItem[];
    total: number;
    totalPages: number;
    summary: Summary;
    buyers?: BuyerOption[];
    isAdmin?: boolean;
  };
  error?: { message?: string };
};

function SortableHeader({
  id,
  label,
  draggable,
}: {
  id: AffiliateColumnId;
  label: string;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !draggable,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: draggable ? "grab" : "default",
  };
  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-5 py-4 select-none"
      {...attributes}
      {...(draggable ? listeners : {})}
    >
      <span className="inline-flex items-center gap-1.5">
        {draggable && (
          <GripVerticalIcon
            size={12}
            className="text-slate-300 dark:text-slate-600 shrink-0"
          />
        )}
        {label}
      </span>
    </th>
  );
}

export default function AffiliateQueuePage() {
  // Pagination state
  const [page, setPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [buyerFilter, setBuyerFilter] = useState("ALL");
  const [sortValue, setSortValue] = useState("createdAt:desc");

  // Mobile lazy loading (accumulator)
  const [mobileItems, setMobileItems] = useState<QueueItem[]>([]);
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileHasMore, setMobileHasMore] = useState(true);
  const [mobileLoadingMore, setMobileLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Detail modal state
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [affiliateLink, setAffiliateLink] = useState("");
  const [note, setNote] = useState("");
  const [closeReason, setCloseReason] = useState("BOUGHT");
  const [closeNote, setCloseNote] = useState("");
  const [orderId, setOrderId] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  // Admin: edit orderId on closed requests
  const [editOrderId, setEditOrderId] = useState("");

  // CSV export loading
  const [exporting, setExporting] = useState(false);

  // Customizable columns (admin gating + per-user prefs)
  const {
    columns: tableColumns,
    setVisibility: setColumnVisibility,
    reorder: reorderColumns,
    resetDefaults: resetColumnDefaults,
  } = useAffiliateColumns();
  const visibleTableColumns = tableColumns.filter((c) => c.visible);

  // dnd-kit sensors — small activation distance so click-targets (sort header
  // text, dropdown trigger) still fire when the user merely clicks.
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderColumns(active.id as AffiliateColumnId, over.id as AffiliateColumnId);
  }

  // Discord linking
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [discordIdInput, setDiscordIdInput] = useState("");
  const [discordLinking, setDiscordLinking] = useState(false);
  const [discordExpanded, setDiscordExpanded] = useState(false);

  // Fetch Discord link status
  useEffect(() => {
    apiFetch<{ ok: boolean; data?: { discordId: string | null } }>("/api/users/me/discord")
      .then((data) => {
        if (data.ok && data.data) {
          setDiscordId(data.data.discordId);
          setDiscordIdInput(data.data.discordId || "");
        }
      })
      .catch(() => { });
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setMobilePage(1);
    setMobileItems([]);
    setMobileHasMore(true);
  }, [debouncedSearch, statusFilter, buyerFilter, sortValue]);

  const [sortBy, sortOrder] = sortValue.split(":") as [string, string];

  const buildParams = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams({
        statusFilter,
        sortBy,
        sortOrder,
        limit: String(PAGE_SIZE),
        page: String(pageNum),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (buyerFilter !== "ALL") params.set("buyerId", buyerFilter);
      return params;
    },
    [statusFilter, sortBy, sortOrder, debouncedSearch, buyerFilter],
  );

  // Desktop fetch via SWR
  const swrKey = `/api/affiliate/queue?${buildParams(page).toString()}`;
  const { data: swrData, isLoading, isValidating, mutate } = useSWR<QueueResponse>(swrKey);
  const items = swrData?.ok ? swrData.data?.items ?? [] : [];
  const total = swrData?.ok ? swrData.data?.total ?? 0 : 0;
  const summary: Summary = swrData?.ok
    ? swrData.data?.summary ?? { total: 0, staleCount: 0, processedCount: 0 }
    : { total: 0, staleCount: 0, processedCount: 0 };
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const loading = isLoading;
  const fetching = isValidating;

  // Sync buyers + isAdmin from SWR response
  useEffect(() => {
    if (swrData?.ok && swrData.data) {
      if (swrData.data.buyers) setBuyers(swrData.data.buyers);
      if (typeof swrData.data.isAdmin === "boolean") setIsAdmin(swrData.data.isAdmin);
    }
  }, [swrData]);

  const fetchQueue = useCallback(() => {
    mutate();
  }, [mutate]);

  // Mobile: sync first page from desktop fetch
  useEffect(() => {
    if (!loading && items.length > 0 && mobilePage === 1) {
      setMobileItems(items);
      setMobileHasMore(page < totalPages);
    }
  }, [loading, items, mobilePage, page, totalPages]);

  // Mobile: load more
  const loadMoreMobile = useCallback(async () => {
    if (mobileLoadingMore || !mobileHasMore) return;
    const nextPage = mobilePage + 1;
    setMobileLoadingMore(true);
    try {
      const params = buildParams(nextPage);
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
  }, [mobileLoadingMore, mobileHasMore, mobilePage, buildParams]);

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

  // CSV export - fetch all data
  async function handleExportCSV() {
    if (visibleTableColumns.length === 0) {
      toast.error("Enable at least one column before exporting");
      return;
    }
    setExporting(true);
    try {
      const params = buildParams(1);
      params.set("limit", "100");
      let allItems: QueueItem[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        params.set("page", String(currentPage));
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
      const headers = visibleTableColumns.map((c) => c.label);
      const rows = allItems.map((item) =>
        visibleTableColumns.map((c) => affiliateColumnValue(item as AffiliateQueueRow, c.id)),
      );

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

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

  function openDetail(item: QueueItem) {
    setSelected(item);
    setAffiliateLink(item.affiliateLink || "");
    setNote(item.notes || "");
    setCloseReason("BOUGHT");
    setCloseNote("");
    setOrderId("");
    setEditOrderId(item.orderId || "");
  }

  async function handleUpdateOrderId() {
    if (!selected) return;
    setActionLoading("editOrderId");
    try {
      const data = await apiFetch<{ ok: boolean; data?: { orderId: string }; error?: { message?: string } }>(
        `/api/requests/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ orderId: editOrderId.trim() }),
        },
      );
      if (data.ok && data.data) {
        toast.success("Order ID updated");
        const newOrderId = data.data.orderId;
        setSelected((prev) => prev ? { ...prev, orderId: newOrderId } : null);
        fetchQueue();
      } else {
        toast.error(data.error?.message || "Failed to update Order ID");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update Order ID");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSave() {
    if (!selected) return;
    setActionLoading("save");

    try {
      if (affiliateLink.trim()) {
        const data = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
          `/api/affiliate/${selected.id}/fill`,
          {
            method: "POST",
            body: JSON.stringify({
              affiliateLink: affiliateLink.trim(),
              note: note.trim() || undefined,
              expectedLastUpdatedAt: selected.lastUpdatedAt,
            }),
          },
        );
        if (data.ok) {
          toast.success("Saved successfully!");
          setSelected(null);
          fetchQueue();
        } else {
          toast.error(data.error?.message || "Failed to save");
        }
      } else if (note.trim() !== (selected.notes || "")) {
        const data = await apiFetch<{
          ok: boolean;
          data?: { lastUpdatedAt: string };
          error?: { message?: string };
        }>(`/api/requests/${selected.id}/note`, {
          method: "POST",
          body: JSON.stringify({
            note: note.trim(),
            expectedLastUpdatedAt: selected.lastUpdatedAt,
          }),
        });
        if (data.ok && data.data) {
          toast.success("Note saved");
          fetchQueue();
          const lastUpdatedAt = data.data.lastUpdatedAt;
          setSelected((prev) =>
            prev ? { ...prev, notes: note.trim(), lastUpdatedAt } : null,
          );
        } else {
          toast.error(data.error?.message || "Failed to save");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setActionLoading("");
    }
  }

  async function handleClose() {
    if (!selected) return;
    setActionLoading("close");

    try {
      const data = await apiFetch<{ ok: boolean; error?: { message?: string } }>(
        `/api/requests/${selected.id}/close`,
        {
          method: "POST",
          body: JSON.stringify({
            closeReason,
            closeNote: closeNote.trim() || undefined,
            orderId: closeReason === "BOUGHT" ? orderId : undefined,
            expectedLastUpdatedAt: selected.lastUpdatedAt,
          }),
        },
      );

      if (data.ok) {
        toast.success("Request closed");
        setSelected(null);
        fetchQueue();
      } else {
        toast.error(data.error?.message || "Failed to close");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close");
    } finally {
      setActionLoading("");
    }
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied!");
  }

  async function saveDiscordLink() {
    setDiscordLinking(true);
    try {
      const data = await apiFetch<{
        ok: boolean;
        data?: { discordId: string | null };
        error?: { message?: string };
      }>("/api/users/me/discord", {
        method: "PUT",
        body: JSON.stringify({ discordId: discordIdInput.trim() || null }),
      });
      if (!data.ok || !data.data) {
        toast.error(data.error?.message || "Lỗi khi lưu Discord ID");
        return;
      }
      setDiscordId(data.data.discordId);
      toast.success(data.data.discordId ? "Đã liên kết Discord!" : "Đã gỡ liên kết Discord");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi kết nối");
    } finally {
      setDiscordLinking(false);
    }
  }

  return (
    <>
      <AppHeader title="Affiliate Queue" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-400 mx-auto w-full pb-20">

          {/* Top Metrics Cards */}
          <TooltipProvider>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
              <Card className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <InboxIcon size={20} className="text-slate-400 dark:text-slate-500" />
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {summary.processedCount}{" "}
                      <span className="text-sm font-medium text-slate-400 dark:text-slate-500">/ {summary.total}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-500 mt-2">
                    Total [Processed / All]
                    <InfoTooltip
                      content={
                        <div className="flex flex-col gap-1">
                          <p><span className="font-semibold">Processed:</span> requests that have been assigned to an affiliate</p>
                          <p><span className="font-semibold">All:</span> total requests submitted</p>
                        </div>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <AlertTriangleIcon size={20} className="text-amber-500" />
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.staleCount}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-500 mt-2">
                    Stale
                    <InfoTooltip
                      content={<p>Requests that have not been closed for too long</p>}
                      contentClassName="max-w-48"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mb-6 ml-2">These metrics are not affected by filters</p>
          </TooltipProvider>

          {/* Discord Linking */}
          <Card className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm overflow-hidden mb-6">
            <CardContent className="p-0">
              <button
                type="button"
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                onClick={() => setDiscordExpanded(!discordExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Link2Icon size={18} className="text-slate-400 dark:text-slate-500" />
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Discord</span>
                  {discordId ? (
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-md font-semibold border border-emerald-200 dark:border-emerald-500/30">Đã liên kết</span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-md font-semibold border border-slate-200 dark:border-slate-700">Chưa liên kết</span>
                  )}
                </div>
                <ChevronDownIcon size={16} className={`text-slate-400 transition-transform ${discordExpanded ? "rotate-180" : ""}`} />
              </button>
              {discordExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Liên kết Discord để fill link trực tiếp từ group chat.
                    Lấy User ID: Discord Settings → Advanced → bật Developer Mode → chuột phải avatar → Copy User ID.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Discord User ID (vd: 123456789012345678)"
                      value={discordIdInput}
                      onChange={(e) => setDiscordIdInput(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={saveDiscordLink}
                      disabled={discordLinking || discordIdInput === (discordId || "")}
                    >
                      {discordLinking ? <LoaderIcon className="h-4 w-4 animate-spin" /> : "Lưu"}
                    </Button>
                    {discordId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setDiscordIdInput("");
                          setDiscordLinking(true);
                          try {
                            const data = await apiFetch<{ ok: boolean }>("/api/users/me/discord", {
                              method: "PUT",
                              body: JSON.stringify({ discordId: null }),
                            });
                            if (data.ok) {
                              setDiscordId(null);
                              toast.success("Đã gỡ liên kết Discord");
                            }
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Lỗi kết nối");
                          } finally {
                            setDiscordLinking(false);
                          }
                        }}
                        disabled={discordLinking}
                      >
                        Gỡ
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            {/* Search */}
            <div className="relative w-full lg:flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <Input
                placeholder="Search requestsId, product name, requester name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 shadow-sm h-10.5"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")} disabled={fetching}>
                <SelectTrigger className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl h-10.5! focus:ring-emerald-500 w-30 shadow-sm">
                  <SelectValue>
                    {({ ALL: "All Status", OPEN: "Open", NEW: "Pending", FILLED: "Ready", CLOSED: "Closed" } as Record<string, string>)[statusFilter] ?? "All Status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="NEW">Pending</SelectItem>
                  <SelectItem value="FILLED">Ready</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={buyerFilter} onValueChange={(v) => setBuyerFilter(v ?? "ALL")} disabled={fetching}>
                <SelectTrigger className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl h-10.5! focus:ring-emerald-500 w-32.5 shadow-sm">
                  <SelectValue>
                    {buyerFilter === "ALL"
                      ? "All Buyers"
                      : (buyers.find((b) => b.id === buyerFilter)?.displayName ||
                        buyers.find((b) => b.id === buyerFilter)?.email ||
                        "All Buyers")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Buyers</SelectItem>
                  {buyers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.displayName || b.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortValue} onValueChange={(v) => setSortValue(v ?? "createdAt:desc")} disabled={fetching}>
                <SelectTrigger className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl h-10.5! focus:ring-emerald-500 w-47.5 shadow-sm">
                  <SelectValue>
                    {SORT_OPTIONS.find((o) => o.value === sortValue)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      className="bg-white hover:bg-slate-50 dark:bg-[#131B2F] dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm text-xs h-10.5"
                    />
                  }
                >
                  <Columns3Icon size={14} className="mr-2" />
                  Columns
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                    Visible columns
                  </div>
                  <DropdownMenuSeparator />
                  {tableColumns.length === 0 ? (
                    <DropdownMenuItem disabled>No columns available</DropdownMenuItem>
                  ) : (
                    tableColumns.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        checked={col.visible}
                        disabled={!!col.mandatory}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) => setColumnVisibility(col.id, !!checked)}
                      >
                        {col.label}
                        {col.mandatory && (
                          <span className="ml-auto text-[10px] text-slate-400">Required</span>
                        )}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={exporting || visibleTableColumns.length === 0}
                className="bg-white hover:bg-slate-50 dark:bg-[#131B2F] dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm text-xs h-10.5"
              >
                <DownloadIcon size={14} className="mr-2" />
                {exporting ? "Exporting..." : "CSV"}
              </Button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && items.length === 0 && (
            <div className="bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <InboxIcon className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Queue is empty</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No requests matching your filters.</p>
            </div>
          )}

          {/* Desktop Table + Mobile Cards */}
          {!loading && items.length > 0 && (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
                {visibleTableColumns.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center text-center">
                    <Columns3Icon className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                      All columns are hidden
                    </h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                      Enable at least one column from the Columns menu, or restore the defaults.
                    </p>
                    <Button size="sm" variant="outline" onClick={resetColumnDefaults}>
                      Restore default columns
                    </Button>
                  </div>
                ) : (
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleColumnDragEnd}
                  >
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <thead className="text-[11px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-[#0B1120]/50 border-b border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400">
                        <SortableContext
                          items={visibleTableColumns.map((c) => c.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          <tr>
                            {visibleTableColumns.map((col) => (
                              <SortableHeader
                                key={col.id}
                                id={col.id}
                                label={col.label}
                                draggable={!col.mandatory}
                              />
                            ))}
                          </tr>
                        </SortableContext>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {items.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50 dark:hover:bg-[#1A233A]/50 transition-colors cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300"
                            onClick={() => openDetail(item)}
                          >
                            {visibleTableColumns.map((col) => (
                              <td key={col.id} className="px-5 py-3.5">
                                {renderAffiliateCell(item as AffiliateQueueRow, col.id)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </DndContext>
                )}
              </div>

              {/* Desktop Pagination */}
              {totalPages > 1 && (
                <div className="hidden lg:flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4">
                {mobileItems.map((item) => (
                  <Card
                    key={item.id}
                    className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm cursor-pointer"
                    onClick={() => openDetail(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{item.id}</span>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{formatRelativeTime(item.createdAt)}</span>
                      </div>
                      <div className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                        {item.productName || item.productUrlRaw}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${PLATFORM_STYLES[item.platform] || PLATFORM_STYLES.OTHER}`}>
                          {item.platform}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${STATUS_BADGE_STYLES[item.status] || STATUS_BADGE_STYLES.NEW}`}>
                            {statusLabel(item.status)}
                          </span>
                          {item.isStale && <AlertTriangleIcon size={14} className="text-amber-500" />}
                          {item.hasPotentialDuplicate && (
                            <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-amber-200 dark:border-amber-500/20">Dup</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-t border-slate-100 dark:border-slate-800/50 pt-3">
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Requester</p>
                          <p className="text-slate-600 dark:text-slate-300 font-medium truncate">{item.createdBy.email}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Owner</p>
                          <div className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                            {item.affiliateOwner && <UserIcon size={12} className="text-slate-400" />}
                            {item.affiliateOwner
                              ? (item.affiliateOwner.displayName || item.affiliateOwner.email)
                              : "—"}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Link</p>
                          {item.affiliateLink ? (
                            <a
                              href={item.affiliateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                            >
                              <span>Open</span>
                              <ExternalLinkIcon size={12} />
                            </a>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 font-medium">—</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div ref={sentinelRef} className="h-1" />
                {mobileLoadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <LoaderIcon className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
                  </div>
                )}
                {!mobileHasMore && mobileItems.length > 0 && (
                  <p className="text-center text-sm text-slate-500 py-4">No more requests</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="p-0 gap-0 sm:max-w-lg lg:max-w-5xl">
            {selected && (
              <div className="flex flex-col rounded-xl overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pr-12 py-5 border-b gap-3">
                  <DialogTitle className="flex items-center gap-3">
                    <code className="font-mono text-lg font-bold tracking-wide">{selected.id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 border border-border"
                      onClick={() => copyId(selected.id)}
                    >
                      <CopyIcon className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTitle>
                  <DialogDescription>
                    <span className="flex items-center gap-2.5 flex-wrap">
                      <Badge className={`text-xs font-semibold ${PLATFORM_STYLES[selected.platform] || ""}`}>
                        {selected.platform}
                      </Badge>
                      <Badge className={`text-xs font-semibold ${STATUS_BADGE_STYLES[selected.status] || ""}`}>
                        {statusLabel(selected.status)}
                      </Badge>
                      {selected.isStale && (
                        <Badge variant="destructive" className="text-xs font-semibold">Stale</Badge>
                      )}
                      <span className="text-muted-foreground text-sm">
                        · {formatRelativeTime(selected.createdAt)}
                      </span>
                    </span>
                  </DialogDescription>
                </DialogHeader>

                {/* Body: 2-col on lg, 1-col on mobile */}
                <div className="flex flex-col lg:flex-row">
                  {/* Left Column: Read-only Info */}
                  <div className="w-full lg:w-[45%] p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border">
                    <div className="space-y-5">
                      {/* Product URL */}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1.5">Product URL</p>
                        <a
                          href={selected.productUrlRaw}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline break-all leading-relaxed flex items-start gap-1 group"
                        >
                          <span className="line-clamp-4">
                            {decodeURIComponent(selected.productUrlRaw.split("?")[0])}
                          </span>
                          <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70 group-hover:opacity-100" />
                        </a>
                      </div>

                      {/* Product Name */}
                      {selected.productName && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1.5">Product Name</p>
                          <p className="text-sm">{selected.productName}</p>
                        </div>
                      )}

                      {/* Requester */}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1.5">Requester</p>
                        <p className="text-sm">
                          {selected.createdBy.email}
                        </p>
                      </div>

                      {/* Order ID (for BOUGHT closed requests) */}
                      {selected.status === "CLOSED" && selected.closeReason === "BOUGHT" && selected.orderId && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1.5">Order ID</p>
                          {isAdmin ? (
                            <div className="flex gap-2">
                              <Input
                                value={editOrderId}
                                onChange={(e) => setEditOrderId(e.target.value)}
                                className="h-9 text-sm font-mono"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleUpdateOrderId}
                                disabled={actionLoading === "editOrderId" || !editOrderId.trim() || editOrderId.trim() === selected.orderId}
                                className="h-9 shrink-0"
                              >
                                {actionLoading === "editOrderId" ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm font-mono">{selected.orderId}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Action Forms */}
                  <div className="w-full lg:w-[55%] flex flex-col">
                    {/* Save Section */}
                    {selected.status !== "CLOSED" && (
                      <div className="p-6 lg:p-8 border-b border-border space-y-4">
                        <div className="space-y-2">
                          <Label>Affiliate Link</Label>
                          <Input
                            placeholder="https://..."
                            value={affiliateLink}
                            onChange={(e) => setAffiliateLink(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            placeholder="Add notes..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={handleSave}
                          disabled={actionLoading === "save"}
                          className="w-full"
                        >
                          {actionLoading === "save" ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    )}

                    {/* Close Request Section (Danger Zone) */}
                    {selected.status !== "CLOSED" && (
                      <div className="p-6 lg:p-8 bg-destructive/5 space-y-4">
                        <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                          <AlertTriangleIcon className="h-4 w-4" />
                          Close Request
                        </p>
                        <Select value={closeReason} onValueChange={(v) => { setCloseReason(v ?? ""); setOrderId(""); }}>
                          <SelectTrigger>
                            <SelectValue>
                              {({ BOUGHT: "Bought", NOT_BUYING: "Not buying", INVALID: "Invalid", STALE: "Stale", OTHER: "Other" } as Record<string, string>)[closeReason] ?? "Reason"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BOUGHT">Bought</SelectItem>
                            <SelectItem value="NOT_BUYING">Not buying</SelectItem>
                            <SelectItem value="INVALID">Invalid</SelectItem>
                            <SelectItem value="STALE">Stale</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {closeReason === "BOUGHT" && (
                          <Input
                            placeholder="Order ID (required)"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                          />
                        )}
                        <Textarea
                          placeholder="Close note (optional)"
                          value={closeNote}
                          onChange={(e) => setCloseNote(e.target.value)}
                          rows={2}
                        />
                        <Button
                          variant="outline"
                          onClick={handleClose}
                          disabled={actionLoading === "close" || (closeReason === "BOUGHT" && !orderId.trim())}
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
                        >
                          {actionLoading === "close" ? "Closing..." : "Close Request"}
                        </Button>
                      </div>
                    )}

                    {/* When closed, show empty state or nothing */}
                    {selected.status === "CLOSED" && (
                      <div className="p-6 lg:p-8 flex items-center justify-center text-sm text-muted-foreground">
                        This request has been closed.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </>
  );
}
