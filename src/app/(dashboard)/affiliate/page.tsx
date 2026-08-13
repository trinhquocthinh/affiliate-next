"use client";

import { useAffiliateQueue } from "@/hooks/use-affiliate-queue";
import { useAffiliateColumns } from "@/hooks/use-affiliate-columns";
import { useAffiliateMobileQueue } from "@/hooks/use-affiliate-mobile-queue";
import { useAffiliateCsvExport } from "@/hooks/use-affiliate-csv-export";
import { useAffiliateDiscordLink } from "@/hooks/use-affiliate-discord-link";
import { useAffiliateDetail } from "@/hooks/use-affiliate-detail";
import { AffiliateQueueToolbar } from "@/components/dashboard/affiliate-queue-toolbar";
import { AffiliateQueueTable } from "@/components/dashboard/affiliate-queue-table";
import { AffiliateQueueMobileList } from "@/components/dashboard/affiliate-queue-mobile-list";
import { AffiliateDiscordCard } from "@/components/dashboard/affiliate-discord-card";
import { AffiliateDetailDialog } from "@/components/dashboard/affiliate-detail-dialog";
import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InboxIcon, AlertTriangleIcon } from "lucide-react";
import { TooltipProvider, InfoTooltip } from "@/components/ui/tooltip";

export default function AffiliateQueuePage() {
  const queue = useAffiliateQueue();
  const columns = useAffiliateColumns();
  const visibleTableColumns = columns.columns.filter((c) => c.visible);

  const mobile = useAffiliateMobileQueue({
    filters: queue.filters,
    desktopLoading: queue.loading,
    desktopItems: queue.items,
    desktopPage: queue.page,
    desktopTotalPages: queue.totalPages,
  });

  const csv = useAffiliateCsvExport(queue.filters, visibleTableColumns);
  const discord = useAffiliateDiscordLink();
  const detail = useAffiliateDetail(queue.fetchQueue);

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
                      {queue.summary.processedCount}{" "}
                      <span className="text-sm font-medium text-slate-400 dark:text-slate-500">/ {queue.summary.total}</span>
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
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{queue.summary.staleCount}</div>
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
          <AffiliateDiscordCard
            discordId={discord.discordId}
            discordIdInput={discord.discordIdInput}
            onDiscordIdInputChange={discord.setDiscordIdInput}
            discordLinking={discord.discordLinking}
            discordExpanded={discord.discordExpanded}
            onToggleExpanded={() => discord.setDiscordExpanded(!discord.discordExpanded)}
            onSave={discord.saveDiscordLink}
            onUnlink={discord.unlinkDiscord}
          />

          {/* Toolbar */}
          <AffiliateQueueToolbar
            search={queue.search}
            onSearchChange={queue.setSearch}
            createdFrom={queue.createdFrom}
            createdTo={queue.createdTo}
            onDateRangeChange={queue.setDateRange}
            statusFilter={queue.statusFilter}
            onStatusFilterChange={queue.setStatusFilter}
            buyerFilter={queue.buyerFilter}
            onBuyerFilterChange={queue.setBuyerFilter}
            buyers={queue.buyers}
            sortValue={queue.sortValue}
            onSortChange={queue.setSortValue}
            fetching={queue.fetching}
            tableColumns={columns.columns}
            onColumnVisibilityChange={columns.setVisibility}
            exporting={csv.exporting}
            onExportCSV={csv.handleExportCSV}
            visibleColumnsCount={visibleTableColumns.length}
          />

          {/* Loading */}
          {queue.loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!queue.loading && queue.items.length === 0 && (
            <div className="bg-white dark:bg-[#131B2F] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <InboxIcon className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Queue is empty</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No requests matching your filters.</p>
            </div>
          )}

          {/* Desktop Table + Mobile Cards */}
          {!queue.loading && queue.items.length > 0 && (
            <>
              <AffiliateQueueTable
                visibleColumns={visibleTableColumns}
                items={queue.items}
                onRowClick={detail.openDetail}
                onColumnReorder={columns.reorder}
                onResetColumnDefaults={columns.resetDefaults}
                page={queue.page}
                totalPages={queue.totalPages}
                total={queue.total}
                onPageChange={queue.setPage}
              />

              <AffiliateQueueMobileList
                items={mobile.mobileItems}
                onItemClick={detail.openDetail}
                sentinelRef={mobile.sentinelRef}
                loadingMore={mobile.mobileLoadingMore}
                hasMore={mobile.mobileHasMore}
              />
            </>
          )}
        </div>
      </div>

      <AffiliateDetailDialog detail={detail} />
    </>
  );
}
