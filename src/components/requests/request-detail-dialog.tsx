"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useActor } from "@/components/layout/actor-provider";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PlatformBadge, StaleBadge } from "@/components/requests/status-badge";
import {
  AlertTriangleIcon,
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  LoaderIcon,
  PencilIcon,
  LinkIcon,
  ShieldIcon,
} from "lucide-react";

type RequestDetail = {
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
  createdBy: { displayName: string | null; email: string };
  affiliateOwner: { displayName: string | null; email: string } | null;
};

export function RequestDetailDialog({
  requestId,
  open,
  onOpenChange,
  onMutated,
}: {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMutated?: () => void;
}) {
  const actor = useActor();
  const [data, setData] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [buyerNote, setBuyerNote] = useState("");
  const [editProductUrl, setEditProductUrl] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [affNote, setAffNote] = useState("");
  const [closeReason, setCloseReason] = useState("BOUGHT");
  const [closeNote, setCloseNote] = useState("");
  const [orderId, setOrderId] = useState("");
  const [adminOrderId, setAdminOrderId] = useState("");
  const [adminBuyerNote, setAdminBuyerNote] = useState("");
  const [busy, setBusy] = useState<string>("");

  const fetchDetail = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}`);
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error?.message || "Failed to load request");
        onOpenChange(false);
        return;
      }
      const r = json.data as RequestDetail;
      setData(r);
      setBuyerNote(r.buyerNote || "");
      setEditProductUrl(r.productUrlRaw);
      setEditPlatform(r.platform);
      setEditProductName(r.productName || "");
      setAffiliateLink(r.affiliateLink || "");
      setAffNote(r.notes || "");
      setCloseReason("BOUGHT");
      setCloseNote("");
      setOrderId("");
      setAdminOrderId(r.orderId || "");
      setAdminBuyerNote(r.buyerNote || "");
    } catch {
      toast.error("Failed to load request");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [requestId, onOpenChange]);

  useEffect(() => {
    if (open && requestId) {
      setData(null);
      fetchDetail();
    }
  }, [open, requestId, fetchDetail]);

  function notifyMutation() {
    onMutated?.();
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied!");
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  async function handleSaveEdit() {
    if (!data) return;
    setBusy("edit");
    try {
      const body: Record<string, unknown> = {
        expectedLastUpdatedAt: data.lastUpdatedAt,
      };
      if (editProductUrl !== data.productUrlRaw) body.productUrl = editProductUrl;
      if (editPlatform !== data.platform) body.platform = editPlatform;
      if (editProductName !== (data.productName || ""))
        body.productName = editProductName || null;
      const res = await fetch(`/api/requests/${data.id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Request updated");
        await fetchDetail();
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setBusy("");
    }
  }

  async function handleSaveBuyerNote() {
    if (!data) return;
    setBusy("buyerNote");
    try {
      const res = await fetch(`/api/requests/${data.id}/buyer-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerNote, expectedLastUpdatedAt: data.lastUpdatedAt }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Note saved");
        await fetchDetail();
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to save note");
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setBusy("");
    }
  }

  async function handleFill() {
    if (!data) return;
    setBusy("fill");
    try {
      const res = await fetch(`/api/affiliate/${data.id}/fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateLink: affiliateLink.trim(),
          note: affNote || undefined,
          expectedLastUpdatedAt: data.lastUpdatedAt,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Saved");
        await fetchDetail();
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setBusy("");
    }
  }

  async function handleClose() {
    if (!data) return;
    setBusy("close");
    try {
      const res = await fetch(`/api/requests/${data.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closeReason,
          closeNote: closeNote || undefined,
          orderId: closeReason === "BOUGHT" ? orderId : undefined,
          expectedLastUpdatedAt: data.lastUpdatedAt,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Request closed");
        onOpenChange(false);
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to close");
      }
    } catch {
      toast.error("Failed to close");
    } finally {
      setBusy("");
    }
  }

  async function handleAdminCorrect() {
    if (!data) return;
    setBusy("adminCorrect");
    try {
      const res = await fetch(`/api/requests/${data.id}/admin-correct`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: adminOrderId || null,
          buyerNote: adminBuyerNote || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Correction saved");
        await fetchDetail();
        notifyMutation();
      } else {
        toast.error(json.error?.message || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setBusy("");
    }
  }

  // ─── Role gates ──────────────────────────────────────────────────────────

  const isOwner = !!data && data.createdBy.email === actor.email;
  const canBuyerEdit = !!data && data.status !== "CLOSED" && (isOwner || actor.isAdmin);
  const canAffiliateAct =
    !!data && data.status !== "CLOSED" && actor.isAffiliate;
  const canAdminCorrect =
    !!data &&
    actor.isAdmin &&
    data.status === "CLOSED" &&
    data.closeReason === "BOUGHT";

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 sm:max-w-lg lg:max-w-4xl">
        {loading && !data ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : data ? (
          <div className="flex flex-col rounded-xl overflow-hidden">
            {/* Header */}
            <DialogHeader className="px-6 pr-12 py-5 border-b border-border gap-3">
              <DialogTitle className="flex items-center gap-3">
                <code className="font-mono text-lg font-bold tracking-wide">{data.id}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 border border-border"
                  onClick={() => copyId(data.id)}
                  aria-label="Copy ID"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                <span className="flex items-center gap-2 flex-wrap">
                  <PlatformBadge platform={data.platform} />
                  <StatusBadge status={data.status} />
                  {data.isStale && <StaleBadge />}
                  <span className="text-muted-foreground text-sm">
                    · {formatRelativeTime(data.createdAt)}
                  </span>
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Body */}
            <div className="flex flex-col lg:flex-row max-h-[70vh] overflow-y-auto lg:overflow-visible">
              {/* Left: read-only info */}
              <div className="w-full lg:w-[45%] p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Product URL
                    </p>
                    <a
                      href={data.productUrlRaw}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all flex items-start gap-1 group"
                    >
                      <span className="line-clamp-4">
                        {decodeURIComponent(data.productUrlRaw.split("?")[0])}
                      </span>
                      <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70 group-hover:opacity-100" />
                    </a>
                  </div>

                  {data.productName && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Product Name
                      </p>
                      <p className="text-sm">{data.productName}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Buyer
                    </p>
                    <p className="text-sm">
                      {data.createdBy.displayName || data.createdBy.email}
                    </p>
                  </div>

                  {data.affiliateOwner && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Claimed by
                      </p>
                      <p className="text-sm">
                        {data.affiliateOwner.displayName || data.affiliateOwner.email}
                      </p>
                    </div>
                  )}

                  {data.affiliateLink && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Affiliate Link
                      </p>
                      <a
                        href={data.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all flex items-start gap-1 group"
                      >
                        <span className="line-clamp-3">{data.affiliateLink}</span>
                        <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70 group-hover:opacity-100" />
                      </a>
                      {data.filledAt && (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          Filled {formatDateTime(data.filledAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {data.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Affiliate Notes
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {data.notes}
                      </p>
                    </div>
                  )}

                  {data.status === "CLOSED" && data.closeReason === "BOUGHT" && data.orderId && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Order ID
                      </p>
                      <p className="text-sm font-mono">{data.orderId}</p>
                    </div>
                  )}

                  {data.status === "CLOSED" && data.closeReason && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Close Reason
                      </p>
                      <p className="text-sm capitalize">
                        {data.closeReason.replace("_", " ").toLowerCase()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: action panels */}
              <div className="w-full lg:w-[55%] flex flex-col lg:overflow-y-auto">
                {/* Affiliate fill (claims implicitly when filled) */}
                {canAffiliateAct && (
                  <div className="p-6 lg:p-8 border-b border-border space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Affiliate Link
                    </p>
                    <Input
                      placeholder="https://..."
                      value={affiliateLink}
                      onChange={(e) => setAffiliateLink(e.target.value)}
                    />
                    <Label className="text-sm">Notes</Label>
                    <Textarea
                      placeholder="Add notes..."
                      value={affNote}
                      onChange={(e) => setAffNote(e.target.value)}
                      rows={2}
                    />
                    <Button
                      onClick={handleFill}
                      disabled={busy === "fill" || !affiliateLink.trim()}
                      className="w-full"
                    >
                      {busy === "fill" ? (
                        <>
                          <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Affiliate Link"
                      )}
                    </Button>
                  </div>
                )}

                {/* Buyer edit */}
                {canBuyerEdit && (
                  <div className="p-6 lg:p-8 border-b border-border space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <PencilIcon className="h-4 w-4" />
                      Edit Request
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Platform</Label>
                      <Select
                        value={editPlatform}
                        onValueChange={(v) => v && setEditPlatform(v)}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {({ SHOPEE: "Shopee", TIKTOK: "TikTok", OTHER: "Other" } as Record<string, string>)[editPlatform] ?? editPlatform}
                          </SelectValue>
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
                      <Label className="text-sm">
                        Product Name{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Input
                        value={editProductName}
                        onChange={(e) => setEditProductName(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={
                        busy === "edit" ||
                        !editProductUrl.trim() ||
                        (editProductUrl === data.productUrlRaw &&
                          editPlatform === data.platform &&
                          editProductName === (data.productName || ""))
                      }
                      className="w-full"
                    >
                      {busy === "edit" ? (
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

                {/* Buyer note */}
                {(isOwner || actor.isAdmin) && (
                  <div className="p-6 lg:p-8 border-b border-border space-y-3">
                    <Label className="text-sm font-semibold">Your Note</Label>
                    <Textarea
                      placeholder={
                        data.status === "CLOSED"
                          ? "Request is closed"
                          : "Add a note for the affiliate..."
                      }
                      value={buyerNote}
                      onChange={(e) => setBuyerNote(e.target.value)}
                      rows={3}
                      disabled={data.status === "CLOSED"}
                    />
                    {data.status !== "CLOSED" && (
                      <Button
                        onClick={handleSaveBuyerNote}
                        disabled={busy === "buyerNote" || buyerNote === (data.buyerNote || "")}
                        className="w-full"
                      >
                        {busy === "buyerNote" ? (
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
                )}

                {/* Close */}
                {canBuyerEdit && (
                  <div className="p-6 lg:p-8 bg-destructive/5 space-y-3">
                    <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangleIcon className="h-4 w-4" />
                      Close Request
                    </p>
                    <Select
                      value={closeReason}
                      onValueChange={(v) => {
                        setCloseReason(v ?? "BOUGHT");
                        setOrderId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {({ BOUGHT: "Bought", NOT_BUYING: "Not buying", INVALID: "Invalid", OTHER: "Other" } as Record<string, string>)[closeReason] ?? "Reason"}
                        </SelectValue>
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
                      disabled={busy === "close" || (closeReason === "BOUGHT" && !orderId.trim())}
                    >
                      {busy === "close" ? (
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

                {/* Admin correction */}
                {canAdminCorrect && (
                  <div className="p-6 lg:p-8 bg-violet-500/5 border-t border-border space-y-3">
                    <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-2">
                      <ShieldIcon className="h-4 w-4" />
                      Admin Correction
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Order ID</Label>
                      <Input
                        placeholder="Correct order ID"
                        value={adminOrderId}
                        onChange={(e) => setAdminOrderId(e.target.value)}
                      />
                    </div>
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
                        busy === "adminCorrect" ||
                        (adminOrderId === (data.orderId || "") &&
                          adminBuyerNote === (data.buyerNote || ""))
                      }
                    >
                      {busy === "adminCorrect" ? (
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

                {data.status === "CLOSED" && !canAdminCorrect && (
                  <div className="p-6 lg:p-8 flex items-center justify-center text-sm text-muted-foreground">
                    This request has been closed.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
