"use client";

import type { useAffiliateDetail } from "@/hooks/use-affiliate-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { AlertTriangleIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { QUEUE_STATUS_BADGE_STYLES, QUEUE_PLATFORM_STYLES } from "@/lib/affiliate-queue";
import { statusLabel } from "@/lib/request-status";
import { usePermissions } from "@/hooks/use-permissions";

export function AffiliateDetailDialog({
  detail,
}: {
  detail: ReturnType<typeof useAffiliateDetail>;
}) {
  const { selected } = detail;
  // Sửa mã đơn ở trạng thái đã đóng là `request.order_id.edit_any_status`
  // (SPEC-008) — AffiliateMaster cũng có quyền này, không riêng Admin.
  const canEditOrderId = usePermissions().hasPermission("request.order_id.edit_any_status");

  return (
    <Dialog open={!!selected} onOpenChange={(open) => !open && detail.closeDetail()}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg lg:max-w-5xl">
        {selected && (
          <div className="flex flex-col overflow-hidden rounded-xl">
            {/* Header */}
            <DialogHeader className="gap-3 border-b px-6 py-5 pr-12">
              <DialogTitle className="flex items-center gap-3">
                <code className="font-mono text-lg font-bold tracking-wide">{selected.id}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 border border-border p-0"
                  onClick={() => detail.copyId(selected.id)}
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                <span className="flex flex-wrap items-center gap-2.5">
                  <Badge
                    className={`text-xs font-semibold ${QUEUE_PLATFORM_STYLES[selected.platform] || ""}`}
                  >
                    {selected.platform}
                  </Badge>
                  <Badge
                    className={`text-xs font-semibold ${QUEUE_STATUS_BADGE_STYLES[selected.status] || ""}`}
                  >
                    {statusLabel(selected.status)}
                  </Badge>
                  {selected.isStale && (
                    <Badge variant="destructive" className="text-xs font-semibold">
                      Stale
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    · {formatRelativeTime(selected.createdAt)}
                  </span>
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Body: 2-col on lg, 1-col on mobile */}
            <div className="flex flex-col lg:flex-row">
              {/* Left Column: Read-only Info */}
              <div className="w-full border-b border-border p-6 lg:w-[45%] lg:border-r lg:border-b-0 lg:p-8">
                <div className="space-y-5">
                  {/* Product URL */}
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">Product URL</p>
                    <a
                      href={selected.productUrlRaw}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-1 text-sm leading-relaxed break-all text-primary hover:underline"
                    >
                      <span className="line-clamp-4">
                        {decodeURIComponent(selected.productUrlRaw.split("?")[0])}
                      </span>
                      <ExternalLinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                    </a>
                  </div>

                  {/* Product Name */}
                  {selected.productName && (
                    <div>
                      <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                        Product Name
                      </p>
                      <p className="text-sm">{selected.productName}</p>
                    </div>
                  )}

                  {/* Requester */}
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">Requester</p>
                    <p className="text-sm">{selected.createdBy.email}</p>
                  </div>

                  {/* Order ID (for BOUGHT closed requests) */}
                  {selected.status === "CLOSED" &&
                    selected.closeReason === "BOUGHT" &&
                    selected.orderId && (
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-muted-foreground">Order ID</p>
                        {canEditOrderId ? (
                          <div className="flex gap-2">
                            <Input
                              value={detail.editOrderId}
                              onChange={(e) => detail.setEditOrderId(e.target.value)}
                              className="h-9 font-mono text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={detail.handleUpdateOrderId}
                              disabled={
                                detail.actionLoading === "editOrderId" ||
                                !detail.editOrderId.trim() ||
                                detail.editOrderId.trim() === selected.orderId
                              }
                              className="h-9 shrink-0"
                            >
                              {detail.actionLoading === "editOrderId" ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        ) : (
                          <p className="font-mono text-sm">{selected.orderId}</p>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {/* Right Column: Action Forms */}
              <div className="flex w-full flex-col lg:w-[55%]">
                {/* Save Section */}
                {selected.status !== "CLOSED" && (
                  <div className="space-y-4 border-b border-border p-6 lg:p-8">
                    <div className="space-y-2">
                      <Label>Affiliate Link</Label>
                      <Input
                        placeholder="https://..."
                        value={detail.affiliateLink}
                        onChange={(e) => detail.setAffiliateLink(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2 pb-2">
                      <Checkbox
                        id="subIdStamped"
                        checked={detail.subIdStamped}
                        onCheckedChange={(checked) => detail.setSubIdStamped(checked === true)}
                      />
                      <Label
                        htmlFor="subIdStamped"
                        className="cursor-pointer text-sm leading-none font-medium"
                      >
                        Tôi đã dán mã yêu cầu vào ô Sub_ID khi tạo link
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Add notes..."
                        value={detail.note}
                        onChange={(e) => detail.setNote(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={detail.handleSave}
                      disabled={detail.actionLoading === "save"}
                      className="w-full"
                    >
                      {detail.actionLoading === "save" ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}

                {/* Close Request Section (Danger Zone) */}
                {selected.status !== "CLOSED" && (
                  <div className="space-y-4 bg-destructive/5 p-6 lg:p-8">
                    <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                      <AlertTriangleIcon className="h-4 w-4" />
                      Close Request
                    </p>
                    <Select
                      value={detail.closeReason}
                      onValueChange={(v) => {
                        detail.setCloseReason(v ?? "");
                        detail.setOrderId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {(
                            {
                              BOUGHT: "Bought",
                              NOT_BUYING: "Not buying",
                              INVALID: "Invalid",
                              STALE: "Stale",
                              OTHER: "Other",
                            } as Record<string, string>
                          )[detail.closeReason] ?? "Reason"}
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
                    {detail.closeReason === "BOUGHT" && (
                      <Input
                        placeholder="Order ID (required)"
                        value={detail.orderId}
                        onChange={(e) => detail.setOrderId(e.target.value)}
                      />
                    )}
                    <Textarea
                      placeholder="Close note (optional)"
                      value={detail.closeNote}
                      onChange={(e) => detail.setCloseNote(e.target.value)}
                      rows={2}
                    />
                    <Button
                      variant="outline"
                      onClick={detail.handleClose}
                      disabled={
                        detail.actionLoading === "close" ||
                        (detail.closeReason === "BOUGHT" && !detail.orderId.trim())
                      }
                      className="border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10"
                    >
                      {detail.actionLoading === "close" ? "Closing..." : "Close Request"}
                    </Button>
                  </div>
                )}

                {/* When closed, show empty state or nothing */}
                {selected.status === "CLOSED" && (
                  <div className="flex items-center justify-center p-6 text-sm text-muted-foreground lg:p-8">
                    This request has been closed.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
