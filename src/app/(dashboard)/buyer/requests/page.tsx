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
import { AlertTriangleIcon, ExternalLinkIcon, ClockIcon, ListIcon } from "lucide-react";

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
      <div className="flex-1 space-y-4 p-4 md:p-6">
        {/* Filters */}
        <Tabs
          value={statusFilter}
          onValueChange={(v) => {
            if (!fetching && v) setStatusFilter(v);
          }}
        >
          <TabsList className={fetching ? "pointer-events-none opacity-60" : undefined}>
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
              <ListIcon className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No requests yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first request to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Desktop Table */}
        {!loading && items.length > 0 && (
          <>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
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
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => openDetail(item)}
                    >
                      <TableCell className="font-mono text-sm">{item.id}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span className="cursor-default border-b border-dashed border-slate-300 dark:border-slate-600" />
                              }
                            >
                              {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </TooltipTrigger>
                            <TooltipContent>{formatDateTime(item.createdAt)}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <PlatformBadge platform={item.platform} className="text-xs" />
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <StatusBadge status={item.status} className="text-xs" />
                          {item.isStale && <AlertTriangleIcon className="h-3 w-3 text-amber-500" />}
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
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            Open <ExternalLinkIcon className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List */}
            <div className="space-y-3 md:hidden">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() => openDetail(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="font-mono text-sm font-medium">{item.id}</code>
                          <PlatformBadge platform={item.platform} className="text-xs" />
                          <StatusBadge status={item.status} className="text-xs" />
                          {item.isStale && <StaleBadge className="text-xs" />}
                        </div>
                        <p className="truncate text-sm">{item.productName || item.productUrlRaw}</p>
                        {item.buyerNote && (
                          <p className="truncate text-xs text-muted-foreground italic">
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
