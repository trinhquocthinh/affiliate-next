"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";

type RequestItem = {
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

function formatRelativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function BuyerRequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<RequestItem | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState("BOUGHT");
  const [closeNote, setCloseNote] = useState("");
  const [orderId, setOrderId] = useState("");

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

  async function handleClose() {
    if (!selectedItem) return;
    setClosing(true);

    try {
      const res = await fetch(`/api/requests/${selectedItem.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closeReason,
          closeNote: closeNote || undefined,
          orderId: closeReason === "BOUGHT" ? orderId : undefined,
          expectedLastUpdatedAt: selectedItem.lastUpdatedAt,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Request closed");
        setSelectedItem(null);
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
            <div className="hidden md:block rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="max-w-xs">Product</TableHead>
                    <TableHead>Affiliate Link</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      <TableCell className="font-mono text-sm">
                        {item.id}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${STATUS_BADGE_STYLES[item.status] || ""}`}
                        >
                          {item.status === "NEW" ? "Pending" : item.status === "FILLED" ? "Ready" : "Closed"}
                        </Badge>
                        {item.isStale && (
                          <AlertTriangleIcon className="inline ml-1 h-3 w-3 text-amber-500" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {item.productName || item.productUrlRaw}
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
                      <TableCell>
                        {item.status === "FILLED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                            }}
                          >
                            Close
                          </Button>
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
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-sm">{item.id}</code>
                      <Badge
                        className={`text-xs ${STATUS_BADGE_STYLES[item.status] || ""}`}
                      >
                        {item.status === "NEW" ? "Pending" : item.status === "FILLED" ? "Ready" : "Closed"}
                      </Badge>
                    </div>
                    <p className="text-sm truncate">
                      {item.productName || item.productUrlRaw}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ClockIcon className="h-3 w-3" />
                      {formatRelativeTime(item.createdAt)}
                      <Badge variant="outline" className="text-xs ml-auto">
                        {item.platform}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Detail / Close Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-lg">
            {selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-mono">
                    {selectedItem.id}
                  </DialogTitle>
                  <DialogDescription>
                    Created {formatRelativeTime(selectedItem.createdAt)} · {selectedItem.platform}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Product URL</p>
                    <a
                      href={selectedItem.productUrlRaw}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {selectedItem.productUrlRaw}
                    </a>
                  </div>
                  {selectedItem.productName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Product Name</p>
                      <p className="text-sm">{selectedItem.productName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge className={`text-xs ${STATUS_BADGE_STYLES[selectedItem.status] || ""}`}>
                      {selectedItem.status === "NEW" ? "Pending" : selectedItem.status === "FILLED" ? "Ready" : "Closed"}
                    </Badge>
                  </div>
                  {selectedItem.affiliateLink && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Affiliate Link</p>
                      <a
                        href={selectedItem.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all flex items-center gap-1"
                      >
                        {selectedItem.affiliateLink}
                        <ExternalLinkIcon className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {selectedItem.notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-sm">{selectedItem.notes}</p>
                    </div>
                  )}

                  {/* Show orderId if closed with BOUGHT */}
                  {selectedItem.status === "CLOSED" && selectedItem.closeReason === "BOUGHT" && selectedItem.orderId && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Order ID</p>
                      <p className="text-sm font-mono">{selectedItem.orderId}</p>
                    </div>
                  )}

                  {/* Close action (only for FILLED status) */}
                  {selectedItem.status === "FILLED" && (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-medium">Close this request</p>
                      <Select value={closeReason} onValueChange={(v) => { setCloseReason(v ?? ""); setOrderId(""); }}>
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
                        variant="destructive"
                        className="w-full"
                        onClick={handleClose}
                        disabled={closing || (closeReason === "BOUGHT" && !orderId.trim())}
                      >
                        {closing ? "Closing..." : "Close Request"}
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
