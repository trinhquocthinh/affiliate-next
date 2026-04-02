"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  InboxIcon,
  AlertTriangleIcon,
  UserIcon,
  ClockIcon,
  SearchIcon,
  ExternalLinkIcon,
  CopyIcon,
} from "lucide-react";

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
  claimedCount: number;
  mineCount: number;
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

function formatRelativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AffiliateQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, staleCount: 0, claimedCount: 0, mineCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [mineOnly, setMineOnly] = useState(false);

  // Detail modal state
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [affiliateLink, setAffiliateLink] = useState("");
  const [note, setNote] = useState("");
  const [closeReason, setCloseReason] = useState("STALE");
  const [closeNote, setCloseNote] = useState("");
  const [orderId, setOrderId] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        statusFilter,
        limit: "50",
      });
      if (search.trim()) params.set("search", search.trim());
      if (mineOnly) params.set("mineOnly", "true");

      const res = await fetch(`/api/affiliate/queue?${params}`);
      const data = await res.json();

      if (data.ok) {
        setItems(data.data.items);
        setSummary(data.data.summary);
      } else {
        toast.error(data.error?.message || "Failed to load queue");
      }
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, mineOnly]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  function openDetail(item: QueueItem) {
    setSelected(item);
    setAffiliateLink(item.affiliateLink || "");
    setNote(item.notes || "");
    setCloseReason("BOUGHT");
    setCloseNote("");
    setOrderId("");
  }

  async function handleFillLink() {
    if (!selected || !affiliateLink.trim()) return;
    setActionLoading("fill");

    try {
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
        toast.success("Affiliate link saved!");
        setSelected(null);
        fetchQueue();
      } else {
        toast.error(data.error?.message || "Failed to save link");
      }
    } catch {
      toast.error("Failed to save link");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSaveNote() {
    if (!selected) return;
    setActionLoading("note");

    try {
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
        // Update selected item's lastUpdatedAt
        setSelected((prev) =>
          prev ? { ...prev, notes: note.trim(), lastUpdatedAt: data.data.lastUpdatedAt } : null,
        );
      } else {
        toast.error(data.error?.message || "Failed to save note");
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setActionLoading("");
    }
  }

  async function handleClaim(unclaim: boolean) {
    if (!selected) return;
    setActionLoading("claim");

    try {
      const res = await fetch(`/api/requests/${selected.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unclaim,
          expectedLastUpdatedAt: selected.lastUpdatedAt,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(unclaim ? "Unclaimed" : "Claimed!");
        setSelected(null);
        fetchQueue();
      } else {
        toast.error(data.error?.message || "Failed");
      }
    } catch {
      toast.error("Operation failed");
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

  return (
    <>
      <AppHeader title="Affiliate Queue" />
      <div className="flex-1 p-4 md:p-6 space-y-4">
        {/* Summary Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total" value={summary.total} icon={InboxIcon} />
          <StatCard title="Stale" value={summary.staleCount} icon={AlertTriangleIcon} />
          <StatCard title="Claimed" value={summary.claimedCount} icon={UserIcon} />
          <StatCard title="Mine" value={summary.mineCount} icon={UserIcon} />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "OPEN")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="NEW">Pending</SelectItem>
              <SelectItem value="FILLED">Ready</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={mineOnly} onCheckedChange={setMineOnly} id="mine-only" />
            <Label htmlFor="mine-only" className="text-sm whitespace-nowrap">
              Mine only
            </Label>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
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

        {/* Queue Cards */}
        {!loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
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
                        <Badge
                          className={`text-xs ${PLATFORM_STYLES[item.platform] || ""}`}
                        >
                          {item.platform}
                        </Badge>
                        <Badge
                          className={`text-xs ${STATUS_BADGE_STYLES[item.status] || ""}`}
                        >
                          {item.status === "NEW" ? "Pending" : item.status === "FILLED" ? "Ready" : "Closed"}
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
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {formatRelativeTime(item.createdAt)}
                        </span>
                        <span>
                          by {item.createdBy.displayName || item.createdBy.email}
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
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <code className="font-mono">{selected.id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyId(selected.id)}
                    >
                      <CopyIcon className="h-3 w-3" />
                    </Button>
                  </DialogTitle>
                  <DialogDescription>
                    <span className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${PLATFORM_STYLES[selected.platform] || ""}`}>
                        {selected.platform}
                      </Badge>
                      <Badge className={`text-xs ${STATUS_BADGE_STYLES[selected.status] || ""}`}>
                        {selected.status === "NEW" ? "Pending" : selected.status === "FILLED" ? "Ready" : "Closed"}
                      </Badge>
                      {selected.isStale && (
                        <Badge variant="destructive" className="text-xs">Stale</Badge>
                      )}
                      <span className="text-muted-foreground">
                        · {formatRelativeTime(selected.createdAt)}
                      </span>
                    </span>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Product Info */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Product URL
                    </p>
                    <a
                      href={selected.productUrlRaw}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all flex items-center gap-1"
                    >
                      {selected.productUrlRaw}
                      <ExternalLinkIcon className="h-3 w-3 shrink-0" />
                    </a>
                  </div>

                  {selected.productName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Product Name
                      </p>
                      <p className="text-sm">{selected.productName}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Requester
                    </p>
                    <p className="text-sm">
                      {selected.createdBy.displayName || selected.createdBy.email}
                    </p>
                  </div>

                  {/* Order ID (for BOUGHT closed requests) */}
                  {selected.status === "CLOSED" && selected.closeReason === "BOUGHT" && selected.orderId && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Order ID</p>
                      <p className="text-sm font-mono">{selected.orderId}</p>
                    </div>
                  )}

                  {/* Affiliate Link Input */}
                  {selected.status !== "CLOSED" && (
                    <div className="space-y-2 border-t pt-4">
                      <Label>Affiliate Link</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://..."
                          value={affiliateLink}
                          onChange={(e) => setAffiliateLink(e.target.value)}
                        />
                        <Button
                          onClick={handleFillLink}
                          disabled={!affiliateLink.trim() || actionLoading === "fill"}
                        >
                          {actionLoading === "fill" ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selected.status !== "CLOSED" && (
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Add notes..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveNote}
                        disabled={actionLoading === "note"}
                      >
                        {actionLoading === "note" ? "Saving..." : "Save Note"}
                      </Button>
                    </div>
                  )}

                  {/* Claim/Unclaim */}
                  {selected.status !== "CLOSED" && (
                    <div className="border-t pt-4">
                      {selected.isOwnedByMe ? (
                        <Button
                          variant="outline"
                          onClick={() => handleClaim(true)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === "claim" ? "..." : "Unclaim"}
                        </Button>
                      ) : !selected.isClaimed ? (
                        <Button
                          onClick={() => handleClaim(false)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === "claim" ? "..." : "Claim"}
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Claimed by{" "}
                          {selected.affiliateOwner?.displayName ||
                            selected.affiliateOwner?.email}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Close Section */}
                  {selected.status !== "CLOSED" && (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-medium text-destructive">
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
                        variant="destructive"
                        onClick={handleClose}
                        disabled={actionLoading === "close" || (closeReason === "BOUGHT" && !orderId.trim())}
                      >
                        {actionLoading === "close" ? "Closing..." : "Close Request"}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
