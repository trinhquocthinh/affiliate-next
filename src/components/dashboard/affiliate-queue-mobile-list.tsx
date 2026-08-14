"use client";

import type { RefObject } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangleIcon, UserIcon, ExternalLinkIcon, LoaderIcon } from "lucide-react";
import {
  QUEUE_STATUS_BADGE_STYLES,
  QUEUE_PLATFORM_STYLES,
  type QueueItem,
} from "@/lib/affiliate-queue";
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
    <div className="space-y-4 lg:hidden">
      {items.map((item) => (
        <Card
          key={item.id}
          className="cursor-pointer rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#131B2F]"
          onClick={() => onItemClick(item)}
        >
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                {item.id}
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {formatRelativeTime(item.createdAt)}
              </span>
            </div>
            <div className="mb-4 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {item.productName || item.productUrlRaw}
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-bold ${QUEUE_PLATFORM_STYLES[item.platform] || QUEUE_PLATFORM_STYLES.OTHER}`}
              >
                {item.platform}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${QUEUE_STATUS_BADGE_STYLES[item.status] || QUEUE_STATUS_BADGE_STYLES.NEW}`}
                >
                  {statusLabel(item.status)}
                </span>
                {item.isStale && <AlertTriangleIcon size={14} className="text-amber-500" />}
                {item.hasPotentialDuplicate && (
                  <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 uppercase dark:border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400">
                    Dup
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800/50">
              <div>
                <p className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Requester
                </p>
                <p className="truncate font-medium text-slate-600 dark:text-slate-300">
                  {item.createdBy.email}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Owner
                </p>
                <div className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                  {item.affiliateOwner && <UserIcon size={12} className="text-slate-400" />}
                  {item.affiliateOwner
                    ? item.affiliateOwner.displayName || item.affiliateOwner.email
                    : "—"}
                </div>
              </div>
              <div className="col-span-2">
                <p className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Link
                </p>
                {item.affiliateLink ? (
                  <a
                    href={item.affiliateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    <span>Open</span>
                    <ExternalLinkIcon size={12} />
                  </a>
                ) : (
                  <span className="font-medium text-slate-400 dark:text-slate-600">—</span>
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
        <p className="py-4 text-center text-sm text-slate-500">No more requests</p>
      )}
    </div>
  );
}
