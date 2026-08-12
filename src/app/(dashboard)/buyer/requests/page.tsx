"use client";

import { formatDateTime } from "@/lib/utils";
import { useBuyerRequests } from "@/hooks/use-buyer-requests";
import { RequestDetailDialog } from "@/components/requests/request-detail-dialog";
import { AppHeader } from "@/components/layout/app-header";
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
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PlatformBadge, StaleBadge } from "@/components/requests/status-badge";
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  ClockIcon,
  ListIcon,
} from "lucide-react";

export default function BuyerRequestsPage() {
  const {
    statusFilter,
    setStatusFilter,
    items,
    loading,
    fetching,
    selectedId,
    openDetail,
    closeDetail,
    mutate,
  } = useBuyerRequests();

  return (
    <>
      <AppHeader title="My Requests" />
      <div className="flex-1 p-4 md:p-6 space-y-4">
        {/* Filters */}
        <Tabs
          value={statusFilter}
          onValueChange={(v) => {
            if (!fetching && v) setStatusFilter(v);
          }}
        >
          <TabsList className={fetching ? "opacity-60 pointer-events-none" : undefined}>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger render={<span className="cursor-default border-b border-dashed border-slate-300 dark:border-slate-600" />}>
                              {new Date(item.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            </TooltipTrigger>
                            <TooltipContent>
                              {formatDateTime(item.createdAt)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <PlatformBadge platform={item.platform} className="text-xs" />
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <StatusBadge status={item.status} className="text-xs" />
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
                          <PlatformBadge platform={item.platform} className="text-xs" />
                          <StatusBadge status={item.status} className="text-xs" />
                          {item.isStale && <StaleBadge className="text-xs" />}
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
                          {formatDateTime(item.createdAt)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <RequestDetailDialog
          requestId={selectedId}
          open={!!selectedId}
          onOpenChange={(open) => !open && closeDetail()}
          onMutated={() => mutate()}
        />
      </div>
    </>
  );
}
