"use client";

import { formatRelativeTime, formatDateTime } from "@/lib/utils";
import { useRequestDetail } from "@/hooks/use-request-detail";
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
  const {
    data,
    loading,
    busy,
    canBuyerNote,
    canBuyerEdit,
    canAffiliateAct,
    canAdminCorrect,
    form,
    actions,
  } = useRequestDetail({ requestId, open, onOpenChange, onMutated });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg lg:max-w-4xl">
        {loading && !data ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : data ? (
          <div className="flex flex-col overflow-hidden rounded-xl">
            {/* Header */}
            <DialogHeader className="gap-3 border-b border-border px-6 py-5 pr-12">
              <DialogTitle className="flex items-center gap-3">
                <code className="font-mono text-lg font-bold tracking-wide">{data.id}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 border border-border p-0"
                  onClick={() => actions.copyId(data.id)}
                  aria-label="Copy ID"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                <span className="flex flex-wrap items-center gap-2">
                  <PlatformBadge platform={data.platform} />
                  <StatusBadge status={data.status} />
                  {data.isStale && <StaleBadge />}
                  <span className="text-sm text-muted-foreground">
                    · {formatRelativeTime(data.createdAt)}
                  </span>
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Body */}
            <div className="flex max-h-[70vh] flex-col overflow-y-auto lg:flex-row lg:overflow-visible">
              {/* Left: read-only info */}
              <div className="w-full border-b border-border p-6 lg:w-[45%] lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-8">
                <div className="space-y-5">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Product URL
                    </p>
                    <a
                      href={data.productUrlRaw}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-1 text-sm break-all text-primary hover:underline"
                    >
                      <span className="line-clamp-4">
                        {decodeURIComponent(data.productUrlRaw.split("?")[0])}
                      </span>
                      <ExternalLinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                    </a>
                  </div>

                  {data.productName && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Product Name
                      </p>
                      <p className="text-sm">{data.productName}</p>
                    </div>
                  )}

                  <div>
                    <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Buyer
                    </p>
                    <p className="text-sm">{data.createdBy.displayName || data.createdBy.email}</p>
                  </div>

                  {data.affiliateOwner && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Claimed by
                      </p>
                      <p className="text-sm">
                        {data.affiliateOwner.displayName || data.affiliateOwner.email}
                      </p>
                    </div>
                  )}

                  {data.affiliateLink && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Affiliate Link
                      </p>
                      <a
                        href={data.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-1 text-sm break-all text-primary hover:underline"
                      >
                        <span className="line-clamp-3">{data.affiliateLink}</span>
                        <ExternalLinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                      </a>
                      {data.filledAt && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <ClockIcon className="h-3 w-3" />
                          Filled {formatDateTime(data.filledAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {data.notes && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Affiliate Notes
                      </p>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {data.notes}
                      </p>
                    </div>
                  )}

                  {data.status === "CLOSED" && data.closeReason === "BOUGHT" && data.orderId && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Order ID
                      </p>
                      <p className="font-mono text-sm">{data.orderId}</p>
                    </div>
                  )}

                  {data.status === "CLOSED" && data.closeReason && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
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
              <div className="flex w-full flex-col lg:w-[55%] lg:overflow-y-auto">
                {/* Affiliate fill (claims implicitly when filled) */}
                {canAffiliateAct && (
                  <div className="space-y-3 border-b border-border p-6 lg:p-8">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <LinkIcon className="h-4 w-4" />
                      Affiliate Link
                    </p>
                    <Input
                      placeholder="https://..."
                      value={form.affiliateLink}
                      onChange={(e) => form.setAffiliateLink(e.target.value)}
                    />
                    <Label className="text-sm">Notes</Label>
                    <Textarea
                      placeholder="Add notes..."
                      value={form.affNote}
                      onChange={(e) => form.setAffNote(e.target.value)}
                      rows={2}
                    />
                    <Button
                      onClick={actions.fill}
                      disabled={busy === "fill" || !form.affiliateLink.trim()}
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
                  <div className="space-y-3 border-b border-border p-6 lg:p-8">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <PencilIcon className="h-4 w-4" />
                      Edit Request
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Platform</Label>
                      <Select
                        value={form.editPlatform}
                        onValueChange={(v) => v && form.setEditPlatform(v)}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {(
                              { SHOPEE: "Shopee", TIKTOK: "TikTok", OTHER: "Other" } as Record<
                                string,
                                string
                              >
                            )[form.editPlatform] ?? form.editPlatform}
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
                        value={form.editProductUrl}
                        onChange={(e) => form.setEditProductUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">
                        Product Name{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        value={form.editProductName}
                        onChange={(e) => form.setEditProductName(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={actions.saveEdit}
                      disabled={
                        busy === "edit" ||
                        !form.editProductUrl.trim() ||
                        (form.editProductUrl === data.productUrlRaw &&
                          form.editPlatform === data.platform &&
                          form.editProductName === (data.productName || ""))
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
                {canBuyerNote && (
                  <div className="space-y-3 border-b border-border p-6 lg:p-8">
                    <Label className="text-sm font-semibold">Your Note</Label>
                    <Textarea
                      placeholder={
                        data.status === "CLOSED"
                          ? "Request is closed"
                          : "Add a note for the affiliate..."
                      }
                      value={form.buyerNote}
                      onChange={(e) => form.setBuyerNote(e.target.value)}
                      rows={3}
                      disabled={data.status === "CLOSED"}
                    />
                    {data.status !== "CLOSED" && (
                      <Button
                        onClick={actions.saveBuyerNote}
                        disabled={busy === "buyerNote" || form.buyerNote === (data.buyerNote || "")}
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
                  <div className="space-y-3 bg-destructive/5 p-6 lg:p-8">
                    <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                      <AlertTriangleIcon className="h-4 w-4" />
                      Close Request
                    </p>
                    <Select
                      value={form.closeReason}
                      onValueChange={(v) => {
                        form.setCloseReason(v ?? "BOUGHT");
                        form.setOrderId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {(
                            {
                              BOUGHT: "Bought",
                              NOT_BUYING: "Not buying",
                              INVALID: "Invalid",
                              OTHER: "Other",
                            } as Record<string, string>
                          )[form.closeReason] ?? "Reason"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOUGHT">Bought</SelectItem>
                        <SelectItem value="NOT_BUYING">Not buying</SelectItem>
                        <SelectItem value="INVALID">Invalid</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.closeReason === "BOUGHT" && (
                      <Input
                        placeholder="Order ID (required)"
                        value={form.orderId}
                        onChange={(e) => form.setOrderId(e.target.value)}
                      />
                    )}
                    <Textarea
                      placeholder="Close note (optional)"
                      value={form.closeNote}
                      onChange={(e) => form.setCloseNote(e.target.value)}
                      rows={2}
                    />
                    <Button
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10"
                      onClick={actions.close}
                      disabled={
                        busy === "close" || (form.closeReason === "BOUGHT" && !form.orderId.trim())
                      }
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
                  <div className="space-y-3 border-t border-border bg-violet-500/5 p-6 lg:p-8">
                    <p className="flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400">
                      <ShieldIcon className="h-4 w-4" />
                      Admin Correction
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Order ID</Label>
                      <Input
                        placeholder="Correct order ID"
                        value={form.adminOrderId}
                        onChange={(e) => form.setAdminOrderId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Buyer Note</Label>
                      <Textarea
                        placeholder="Correct buyer note"
                        value={form.adminBuyerNote}
                        onChange={(e) => form.setAdminBuyerNote(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-violet-400/40 text-violet-600 hover:border-violet-400/60 hover:bg-violet-500/10 dark:text-violet-400"
                      onClick={actions.adminCorrect}
                      disabled={
                        busy === "adminCorrect" ||
                        (form.adminOrderId === (data.orderId || "") &&
                          form.adminBuyerNote === (data.buyerNote || ""))
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
                  <div className="flex items-center justify-center p-6 text-sm text-muted-foreground lg:p-8">
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
