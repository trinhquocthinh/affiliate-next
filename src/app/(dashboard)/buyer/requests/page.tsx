"use client";

import { useEffect, useState, useCallback } from "react";
import { useActor } from "@/components/layout/actor-provider";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  ClockIcon,
  ListIcon,
  CopyIcon,
  LoaderIcon,
  ShieldIcon,
  PencilIcon,
} from "lucide-react";

type RequestItem = {
  id: string;
  createdAt: string;
  platform: string;
  productUrlRaw: string;
  productName: string | null;
  affiliateLink: string | null;
  filledAt: string | null;
  status: string;
  closeReason: string | null;
  orderId: string | null;
  notes: string | null;
  buyerNote: string | null;
  isStale: boolean;
  ageHours: number;
  lastUpdatedAt: string;
  duplicateOfId: string | null;
  createdBy: { displayName: string | null; email: string };
  affiliateOwner: { displayName: string | null; email: string } | null;
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

function statusLabel(status: string) {
  if (status === "NEW") return "Pending";
  if (status === "FILLED") return "Ready";
  return "Closed";
}

export default function BuyerRequestsPage() {
  const { isAdmin } = useActor();

  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<RequestItem | null>(null);

  // Buyer note state
  const [buyerNote, setBuyerNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Close state
  const [closeReason, setCloseReason] = useState("BOUGHT");
  const [closeNote, setCloseNote] = useState("");
  const [orderId, setOrderId] = useState("");
  const [closing, setClosing] = useState(false);

  // Admin correction state
  const [adminOrderId, setAdminOrderId] = useState("");
  const [adminBuyerNote, setAdminBuyerNote] = useState("");
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Edit request state
  const [editProductUrl, setEditProductUrl] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();

      if (data.ok) {
        setItems(data.data.items);
      } else {
        toast.error(data.error?.message || "Failed to load requests");
      }
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  function openDetail(item: RequestItem) {
    setSelected(item);
    setBuyerNote(item.buyerNote || "");
    setCloseReason("BOUGHT");
    setCloseNote("");
    setOrderId("");
    setAdminOrderId(item.orderId || "");
    setAdminBuyerNote(item.buyerNote || "");
    setEditProductUrl(item.productUrlRaw);
    setEditPlatform(item.platform);
    setEditProductName(item.productName || "");
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied!");
  }

  async function handleSaveBuyerNote() {
    if (!selected) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/requests/${selected.id}/buyer-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerNote,
          expectedLastUpdatedAt: selected.lastUpdatedAt,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Note saved");
        setSelected(null);
        fetchRequests();
      } else {
        toast.error(data.error?.message || "Failed to save note");
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleSaveEdit() {
    if (!selected) return;
    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = {
        expectedLastUpdatedAt: selected.lastUpdatedAt,
      };
      if (editProductUrl !== selected.productUrlRaw) body.productUrl = editProductUrl;
      if (editPlatform !== selected.platform) body.platform = editPlatform;
      if (editProductName !== (selected.productName || "")) body.productName = editProductName || null;

      const res = await fetch(`/api/requests/${selected.id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Request updated");
        setSelected((prev) =>
          prev
            ? {
                ...prev,
                productUrlRaw: data.data.productUrlRaw,
                platform: data.data.platform,
                productName: data.data.productName,
                lastUpdatedAt: data.data.lastUpdatedAt,
              }
            : null,
        );
        fetchRequests();
      } else {
        toast.error(data.error?.message || "Failed to update request");
      }
    } catch {
      toast.error("Failed to update request");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAdminCorrect() {
    if (!selected) return;
    setSavingCorrection(true);
    try {
      const res = await fetch(`/api/requests/${selected.id}/admin-correct`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: adminOrderId || null,
          buyerNote: adminBuyerNote || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Correction saved");
        setSelected((prev) =>
          prev
            ? {
                ...prev,
                orderId: data.data.orderId,
                buyerNote: data.data.buyerNote,
                lastUpdatedAt: data.data.lastUpdatedAt,
              }
            : null,
        );
        fetchRequests();
      } else {
        toast.error(data.error?.message || "Failed to save correction");
      }
    } catch {
      toast.error("Failed to save correction");
    } finally {
      setSavingCorrection(false);
    }
  }

  async function handleClose() {
    if (!selected) return;
    setClosing(true);

    try {
      const res = await fetch(`/api/requests/${selected.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closeReason,
          closeNote: closeNote || undefined,
          orderId: closeReason === "BOUGHT" ? orderId : undefined,
          expectedLastUpdatedAt: selected.lastUpdatedAt,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Request closed");
        setSelected(null);
        setCloseNote("");
        setOrderId("");
        fetchRequests();
      } else {
        toast.error(data.error?.message || "Failed to close request");
      }
    } catch {
      toast.error("Failed to close request");
    } finally {
      setClosing(false);
    }
  }

  return (
    <>
      <AppHeader title="My Requests" />
      <div className="flex-1 p-4 md:p-6 space-y-4">
        {/* Filters */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="NEW">Pending</TabsTrigger>
            <TabsTrigger value="FILLED">Ready</TabsTrigger>
            <TabsTrigger value="CLOSED">Closed</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ListIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first request to get started.
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
                    <TableHead>Created</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="max-w-xs">Product</TableHead>
                    <TableHead>Your Note</TableHead>
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
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {item.productName || item.productUrlRaw}
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                        {item.buyerNote || <span className="italic opacity-40">—</span>}
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

            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
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
                          <code className="font-mono text-sm font-medium">{item.id}</code>
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
                        </div>
                        <p className="text-sm truncate">
                          {item.productName || item.productUrlRaw}
                        </p>
                        {item.buyerNote && (
                          <p className="text-xs text-muted-foreground truncate italic">
                            Note: {item.buyerNote}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ClockIcon className="h-3 w-3" />
                          {formatRelativeTime(item.createdAt)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Detail Dialog — 2-col layout matching affiliate page */}
        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="p-0 gap-0 sm:max-w-lg lg:max-w-4xl">
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

                {/* Body: 2-col on lg */}
                <div className="flex flex-col lg:flex-row max-h-[70vh] overflow-y-auto lg:overflow-visible">
                  {/* Left Column: Read-only Info */}
                  <div className="w-full lg:w-[45%] p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto">
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

                      {/* Affiliate Link */}
                      {selected.affiliateLink && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1.5">Affiliate Link</p>
                          <a
                            href={selected.affiliateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all flex items-start gap-1 group"
                          >
                            <span className="line-clamp-3">{selected.affiliateLink}</span>
                            <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70 group-hover:opacity-100" />
                          </a>
                          {selected.filledAt && (
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              Filled {formatDateTime(selected.filledAt)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Affiliate Notes */}
                      {selected.notes && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1.5">Affiliate Notes</p>
                          <p className="text-sm text-muted-foreground">{selected.notes}</p>
                        </div>
                      )}

                      {/* Order ID if closed */}
                      {selected.status === "CLOSED" && selected.closeReason === "BOUGHT" && selected.orderId && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1.5">Order ID</p>
                          <p className="text-sm font-mono">{selected.orderId}</p>
                        </div>
                      )}

                      {/* Close reason */}
                      {selected.status === "CLOSED" && selected.closeReason && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1.5">Close Reason</p>
                          <p className="text-sm capitalize">{selected.closeReason.replace("_", " ").toLowerCase()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="w-full lg:w-[55%] flex flex-col lg:overflow-y-auto">
                    {/* Edit Request — only for non-CLOSED */}
                    {selected.status !== "CLOSED" && (
                      <div className="p-6 lg:p-8 border-b border-border space-y-4">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <PencilIcon className="h-4 w-4" />
                          Edit Request
                        </p>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Platform</Label>
                            <Select value={editPlatform} onValueChange={(v) => v && setEditPlatform(v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SHOPEE">Shopee</SelectItem>
                                <SelectItem value="TIKTOK">TikTok</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Product URL</Label>
                            <Input
                              value={editProductUrl}
                              onChange={(e) => setEditProductUrl(e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Product Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Input
                              value={editProductName}
                              onChange={(e) => setEditProductName(e.target.value)}
                              placeholder="Product name"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleSaveEdit}
                          disabled={
                            savingEdit ||
                            !editProductUrl.trim() ||
                            (
                              editProductUrl === selected.productUrlRaw &&
                              editPlatform === selected.platform &&
                              editProductName === (selected.productName || "")
                            )
                          }
                          className="w-full"
                        >
                          {savingEdit ? (
                            <>
                              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    )}
                    {/* Buyer Note */}
                    <div className="p-6 lg:p-8 border-b border-border space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Your Note</Label>
                        <Textarea
                          placeholder={
                            selected.status === "CLOSED"
                              ? "Request is closed"
                              : "Add a note for the affiliate (e.g. preferred variant, color, size...)"
                          }
                          value={buyerNote}
                          onChange={(e) => setBuyerNote(e.target.value)}
                          rows={3}
                          disabled={selected.status === "CLOSED"}
                          className={selected.status === "CLOSED" ? "opacity-60 cursor-not-allowed" : ""}
                        />
                      </div>
                      {selected.status !== "CLOSED" && (
                        <Button
                          onClick={handleSaveBuyerNote}
                          disabled={savingNote || buyerNote === (selected.buyerNote || "")}
                          className="w-full"
                        >
                          {savingNote ? (
                            <>
                              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Note"
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Close Request — for NEW and FILLED (not CLOSED) */}
                    {selected.status !== "CLOSED" && (
                      <div className="p-6 lg:p-8 bg-destructive/5 space-y-4">
                        <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                          <AlertTriangleIcon className="h-4 w-4" />
                          Close Request
                        </p>
                        <Select value={closeReason} onValueChange={(v) => { setCloseReason(v ?? "BOUGHT"); setOrderId(""); }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Reason" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BOUGHT">Bought</SelectItem>
                            <SelectItem value="NOT_BUYING">Not buying</SelectItem>
                            <SelectItem value="INVALID">Invalid</SelectItem>
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
                          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
                          onClick={handleClose}
                          disabled={closing || (closeReason === "BOUGHT" && !orderId.trim())}
                        >
                          {closing ? (
                            <>
                              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                              Closing...
                            </>
                          ) : (
                            "Close Request"
                          )}
                        </Button>
                      </div>
                    )}

                    {selected.status === "CLOSED" && !isAdmin && (
                      <div className="p-6 lg:p-8 flex items-center justify-center text-sm text-muted-foreground">
                        This request has been closed.
                      </div>
                    )}

                    {/* Admin Correction — only for CLOSED + admin */}
                    {selected.status === "CLOSED" && isAdmin && (
                      <div className="p-6 lg:p-8 bg-violet-500/5 border-t border-border space-y-4">
                        <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-2">
                          <ShieldIcon className="h-4 w-4" />
                          Admin Correction
                        </p>
                        {selected.closeReason === "BOUGHT" && (
                          <div className="space-y-1.5">
                            <Label className="text-sm">Order ID</Label>
                            <Input
                              placeholder="Correct order ID"
                              value={adminOrderId}
                              onChange={(e) => setAdminOrderId(e.target.value)}
                            />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-sm">Buyer Note</Label>
                          <Textarea
                            placeholder="Correct buyer note"
                            value={adminBuyerNote}
                            onChange={(e) => setAdminBuyerNote(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-violet-400/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:border-violet-400/60"
                          onClick={handleAdminCorrect}
                          disabled={
                            savingCorrection ||
                            (adminOrderId === (selected.orderId || "") &&
                              adminBuyerNote === (selected.buyerNote || ""))
                          }
                        >
                          {savingCorrection ? (
                            <>
                              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Correction"
                          )}
                        </Button>
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
