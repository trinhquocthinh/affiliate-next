"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  InboxIcon,
  AlertTriangleIcon,
  UserIcon,
  ClockIcon,
  SearchIcon,
  ExternalLinkIcon,
  CopyIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
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
  NEW: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  FILLED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const PLATFORM_STYLES: Record<string, string> = {
  SHOPEE: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  TIKTOK: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  OTHER: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
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

export default function AffiliateQueuePage() {
  // Data
  const [items, setItems] = useState<QueueItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, staleCount: 0, processedCount: 0 });
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [buyerFilter, setBuyerFilter] = useState("ALL");
  const [sortValue, setSortValue] = useState("createdAt:desc");

  // Mobile lazy loading
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

  // Discord linking
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [discordIdInput, setDiscordIdInput] = useState("");
  const [discordLinking, setDiscordLinking] = useState(false);
  const [discordExpanded, setDiscordExpanded] = useState(false);

  // Fetch Discord link status
  useEffect(() => {
    fetch("/api/users/me/discord")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setDiscordId(data.data.discordId);
          setDiscordIdInput(data.data.discordId || "");
        }
      })
      .catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

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

  // Desktop fetch
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(page);
      const res = await fetch(`/api/affiliate/queue?${params}`);
      const data = await res.json();
      if (data.ok) {
        setItems(data.data.items);
        setTotal(data.data.total);
        setSummary(data.data.summary);
        if (data.data.buyers) setBuyers(data.data.buyers);
        if (typeof data.data.isAdmin === "boolean") setIsAdmin(data.data.isAdmin);
      } else {
        toast.error(data.error?.message || "Failed to load queue");
      }
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [buildParams, page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

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
      const res = await fetch(`/api/affiliate/queue?${params}`);
      const data = await res.json();
      if (data.ok) {
        setMobileItems((prev) => [...prev, ...data.data.items]);
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
    setExporting(true);
    try {
      const params = buildParams(1);
      params.set("limit", "100");
      let allItems: QueueItem[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        params.set("page", String(currentPage));
        const res = await fetch(`/api/affiliate/queue?${params}`);
        const data = await res.json();
        if (!data.ok) {
          toast.error("Failed to export");
          return;
        }
        allItems = [...allItems, ...data.data.items];
        hasMore = currentPage < data.data.totalPages;
        currentPage++;
      }

      const headers = ["ID", "Order ID", "Created", "Platform", "Status", "Product Name", "Product URL", "Requester", "Affiliate Owner", "Affiliate Link"];
      const rows = allItems.map((item) => [
        item.id,
        item.orderId || "",
        new Date(item.createdAt).toISOString(),
        item.platform,
        item.status,
        item.productName || "",
        decodeURIComponent(item.productUrlRaw.split("?")[0]),
        item.createdBy.email,
        item.affiliateOwner?.displayName || item.affiliateOwner?.email || "",
        item.affiliateLink ? decodeURIComponent(item.affiliateLink) : "",
      ]);

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
      const res = await fetch(`/api/requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: editOrderId.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Order ID updated");
        setSelected((prev) => prev ? { ...prev, orderId: data.data.orderId } : null);
        fetchQueue();
      } else {
        toast.error(data.error?.message || "Failed to update Order ID");
      }
    } catch {
      toast.error("Failed to update Order ID");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSave() {
    if (!selected) return;
    setActionLoading("save");

    try {
      if (affiliateLink.trim()) {
        const res = await fetch(`/api/affiliate/${selected.id}/fill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            affiliateLink: affiliateLink.trim(),
            note: note.trim() || undefined,
            expectedLastUpdatedAt: selected.lastUpdatedAt,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("Saved successfully!");
          setSelected(null);
          fetchQueue();
        } else {
          toast.error(data.error?.message || "Failed to save");
        }
      } else if (note.trim() !== (selected.notes || "")) {
        const res = await fetch(`/api/requests/${selected.id}/note`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: note.trim(),
            expectedLastUpdatedAt: selected.lastUpdatedAt,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("Note saved");
          fetchQueue();
          setSelected((prev) =>
            prev ? { ...prev, notes: note.trim(), lastUpdatedAt: data.data.lastUpdatedAt } : null,
          );
        } else {
          toast.error(data.error?.message || "Failed to save");
        }
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setActionLoading("");
    }
  }

  async function handleClose() {
    if (!selected) return;
    setActionLoading("close");

    try {
      const res = await fetch(`/api/requests/${selected.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closeReason,
          closeNote: closeNote.trim() || undefined,
          orderId: closeReason === "BOUGHT" ? orderId : undefined,
          expectedLastUpdatedAt: selected.lastUpdatedAt,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Request closed");
        setSelected(null);
        fetchQueue();
      } else {
        toast.error(data.error?.message || "Failed to close");
      }
    } catch {
      toast.error("Failed to close");
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
      const res = await fetch("/api/users/me/discord", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId: discordIdInput.trim() || null }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error?.message || "Lỗi khi lưu Discord ID");
        return;
      }
      setDiscordId(data.data.discordId);
      toast.success(data.data.discordId ? "Đã liên kết Discord!" : "Đã gỡ liên kết Discord");
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setDiscordLinking(false);
    }
  }

  return (
    <>
      <AppHeader title="Affiliate Queue" />
      <div className="flex-1 p-4 md:p-6 space-y-4">
        {/* Overview Stats — always shows unfiltered totals */}
        <TooltipProvider>
          <div className="grid gap-3 grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <InboxIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {summary.processedCount}
                    <span className="text-base font-normal text-muted-foreground"> / {summary.total}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Total (Processed / All)
                    <InfoTooltip
                      content={
                        <div className="flex flex-col gap-1">
                          <p><span className="font-semibold">Processed:</span> requests that have been assigned to an affiliate</p>
                          <p><span className="font-semibold">All:</span> total requests submitted</p>
                        </div>
                      }
                    />
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.staleCount}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Stale
                    <InfoTooltip
                      content={<p>Requests that have not been closed for too long</p>}
                      contentClassName="max-w-48"
                    />
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground/70 italic">These metrics are not affected by filters</p>
        </TooltipProvider>

        {/* Discord Linking */}
        <Card>
          <CardContent className="p-4">
            <button
              type="button"
              className="flex items-center justify-between w-full text-left"
              onClick={() => setDiscordExpanded(!discordExpanded)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🔗</span>
                <span className="text-sm font-medium">Discord</span>
                {discordId ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
                    Đã liên kết
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Chưa liên kết</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{discordExpanded ? "▲" : "▼"}</span>
            </button>
            {discordExpanded && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
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
                          const res = await fetch("/api/users/me/discord", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ discordId: null }),
                          });
                          const data = await res.json();
                          if (data.ok) {
                            setDiscordId(null);
                            toast.success("Đã gỡ liên kết Discord");
                          }
                        } catch {
                          toast.error("Lỗi kết nối");
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

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Export */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requestsId, product name, requester name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={exporting}
              className="shrink-0"
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              {exporting ? "Exporting..." : "CSV"}
            </Button>
          </div>

          {/* Row 2: Filter dropdowns */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="NEW">Pending</SelectItem>
                <SelectItem value="FILLED">Ready</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={buyerFilter} onValueChange={(v) => setBuyerFilter(v ?? "ALL")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Buyers" />
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

            <Select value={sortValue} onValueChange={(v) => setSortValue(v ?? "createdAt:desc")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <InboxIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Queue is empty</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No requests matching your filters.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Desktop Table */}
        {!loading && items.length > 0 && (
          <>
            <div className="hidden md:block rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="max-w-xs">Product</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Affiliate Owner</TableHead>
                    <TableHead>Affiliate Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => openDetail(item)}
                    >
                      <TableCell className="font-mono text-sm">
                        {item.id}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono whitespace-nowrap">
                        {item.orderId || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${PLATFORM_STYLES[item.platform] || ""}`}>
                          {item.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Badge className={`text-xs ${STATUS_BADGE_STYLES[item.status] || ""}`}>
                            {statusLabel(item.status)}
                          </Badge>
                          {item.isStale && (
                            <AlertTriangleIcon className="h-3 w-3 text-amber-500" />
                          )}
                          {item.hasPotentialDuplicate && (
                            <Badge variant="secondary" className="text-xs text-amber-600">Dup</Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {item.productName || item.productUrlRaw}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {item.createdBy.email}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {item.affiliateOwner ? (
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {item.affiliateOwner.displayName || item.affiliateOwner.email}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.affiliateLink ? (
                          <a
                            href={item.affiliateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            Open <ExternalLinkIcon className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Desktop Pagination */}
            {totalPages > 1 && (
              <div className="hidden md:flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Mobile Card List with infinite scroll */}
            <div className="md:hidden space-y-3">
              {mobileItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                  onClick={() => openDetail(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="font-mono text-sm font-medium">
                            {item.id}
                          </code>
                          <Badge className={`text-xs ${PLATFORM_STYLES[item.platform] || ""}`}>
                            {item.platform}
                          </Badge>
                          <Badge className={`text-xs ${STATUS_BADGE_STYLES[item.status] || ""}`}>
                            {statusLabel(item.status)}
                          </Badge>
                          {item.isStale && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangleIcon className="mr-1 h-3 w-3" />
                              Stale
                            </Badge>
                          )}
                          {item.hasPotentialDuplicate && (
                            <Badge variant="secondary" className="text-xs text-amber-600">
                              Duplicate
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm truncate">
                          {item.productName || item.productUrlRaw}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Order: {item.orderId || "—"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {formatRelativeTime(item.createdAt)}
                          </span>
                          <span>
                            by {item.createdBy.email}
                          </span>
                          {item.affiliateOwner && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {item.affiliateOwner.displayName || item.affiliateOwner.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Sentinel for infinite scroll */}
              <div ref={sentinelRef} className="h-1" />
              {mobileLoadingMore && (
                <div className="flex items-center justify-center py-4">
                  <LoaderIcon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!mobileHasMore && mobileItems.length > 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No more requests
                </p>
              )}
            </div>
          </>
        )}

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
                                className="h-8 text-sm font-mono"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleUpdateOrderId}
                                disabled={actionLoading === "editOrderId" || !editOrderId.trim() || editOrderId.trim() === selected.orderId}
                                className="h-8 shrink-0"
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
                            <SelectValue placeholder="Reason" />
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
      </div>
    </>
  );
}
