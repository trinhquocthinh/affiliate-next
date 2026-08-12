"use client";

import type { RefObject } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangleIcon,
  UserIcon,
  ExternalLinkIcon,
  LoaderIcon,
} from "lucide-react";
import { QUEUE_STATUS_BADGE_STYLES, QUEUE_PLATFORM_STYLES, type QueueItem } from "@/lib/affiliate-queue";
import { statusLabel } from "@/lib/request-status";

export function AffiliateQueueMobileList({
  items,
  onItemClick,
  sentinelRef,
  loadingMore,
  hasMore,
}: {
  items: QueueItem[];
  onItemClick: (item: QueueItem) => void;
  sentinelRef: RefObject<HTMLDivElement | null>;
  loadingMore: boolean;
  hasMore: boolean;
}) {
  return (
    <div className="lg:hidden space-y-4">
      {items.map((item) => (
        <Card
          key={item.id}
          className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm cursor-pointer"
          onClick={() => onItemClick(item)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{item.id}</span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{formatRelativeTime(item.createdAt)}</span>
            </div>
            <div className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
              {item.productName || item.productUrlRaw}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${QUEUE_PLATFORM_STYLES[item.platform] || QUEUE_PLATFORM_STYLES.OTHER}`}>
                {item.platform}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${QUEUE_STATUS_BADGE_STYLES[item.status] || QUEUE_STATUS_BADGE_STYLES.NEW}`}>
                  {statusLabel(item.status)}
                </span>
                {item.isStale && <AlertTriangleIcon size={14} className="text-amber-500" />}
                {item.hasPotentialDuplicate && (
                  <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-amber-200 dark:border-amber-500/20">Dup</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-t border-slate-100 dark:border-slate-800/50 pt-3">
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Requester</p>
                <p className="text-slate-600 dark:text-slate-300 font-medium truncate">{item.createdBy.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Owner</p>
                <div className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                  {item.affiliateOwner && <UserIcon size={12} className="text-slate-400" />}
                  {item.affiliateOwner
                    ? (item.affiliateOwner.displayName || item.affiliateOwner.email)
                    : "—"}
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Link</p>
                {item.affiliateLink ? (
                  <a
                    href={item.affiliateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    <span>Open</span>
                    <ExternalLinkIcon size={12} />
                  </a>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600 font-medium">—</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <LoaderIcon className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <p className="text-center text-sm text-slate-500 py-4">No more requests</p>
      )}
    </div>
  );
}
