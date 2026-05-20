"use client";

import { UserIcon, AlertTriangleIcon, ExternalLinkIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { AffiliateColumnId } from "@/lib/affiliate-columns";

// Mirrors the shape used by the affiliate queue page. Keeping a structural
// type here avoids a circular import.
export type AffiliateQueueRow = {
  id: string;
  createdAt: string;
  platform: string;
  productUrlRaw: string;
  productName: string | null;
  affiliateLink: string | null;
  status: string;
  orderId: string | null;
  isStale: boolean;
  hasPotentialDuplicate: boolean;
  createdBy: { displayName: string | null; email: string };
  affiliateOwner: { displayName: string | null; email: string } | null;
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  FILLED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
};

const PLATFORM_STYLES: Record<string, string> = {
  SHOPEE: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  TIKTOK: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  OTHER: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
};

function statusLabel(status: string) {
  if (status === "NEW") return "Pending";
  if (status === "FILLED") return "Ready";
  return "Closed";
}

/**
 * Render the `<td>` content for a given column id. Rich JSX (badges, links,
 * truncation) lives here so the page component does not have to.
 */
export function renderAffiliateCell(item: AffiliateQueueRow, columnId: AffiliateColumnId) {
  switch (columnId) {
    case "id":
      return <span className="font-mono">{item.id}</span>;
    case "orderId":
      return (
        <span className="text-slate-400 dark:text-slate-600">{item.orderId || "—"}</span>
      );
    case "createdAt":
      return <span>{formatRelativeTime(item.createdAt)}</span>;
    case "platform":
      return (
        <span
          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
            PLATFORM_STYLES[item.platform] || PLATFORM_STYLES.OTHER
          }`}
        >
          {item.platform}
        </span>
      );
    case "status":
      return (
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${
              STATUS_BADGE_STYLES[item.status] || STATUS_BADGE_STYLES.NEW
            }`}
          >
            {statusLabel(item.status)}
          </span>
          {item.isStale && <AlertTriangleIcon size={14} className="text-amber-500" />}
          {item.hasPotentialDuplicate && (
            <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-amber-200 dark:border-amber-500/20 shadow-sm">
              Dup
            </span>
          )}
        </div>
      );
    case "productName":
      return (
        <span
          className="block max-w-55 truncate"
          title={item.productName || item.productUrlRaw}
        >
          {item.productName || item.productUrlRaw}
        </span>
      );
    case "requester":
      return (
        <span className="text-slate-500 dark:text-slate-400">{item.createdBy.email}</span>
      );
    case "affiliateOwner":
      return item.affiliateOwner ? (
        <div className="flex items-center gap-1.5">
          <UserIcon size={12} className="text-slate-400" />
          <span>{item.affiliateOwner.displayName || item.affiliateOwner.email}</span>
        </div>
      ) : (
        <span className="text-slate-400 dark:text-slate-500">—</span>
      );
    case "affiliateLink":
      return item.affiliateLink ? (
        <a
          href={item.affiliateLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <span>Open</span>
          <ExternalLinkIcon size={12} />
        </a>
      ) : (
        <span className="text-slate-400 dark:text-slate-600">—</span>
      );
    default: {
      const _exhaustive: never = columnId;
      return _exhaustive;
    }
  }
}

/**
 * Plain-text value for a column. Used by the CSV export so the file mirrors
 * the on-screen labels (status "Pending" not "NEW", platform raw, etc.).
 */
export function affiliateColumnValue(item: AffiliateQueueRow, columnId: AffiliateColumnId): string {
  switch (columnId) {
    case "id":
      return item.id;
    case "orderId":
      return item.orderId ?? "";
    case "createdAt":
      return new Date(item.createdAt).toISOString();
    case "platform":
      return item.platform;
    case "status":
      return statusLabel(item.status);
    case "productName":
      return item.productName || (item.productUrlRaw ? decodeURIComponent(item.productUrlRaw.split("?")[0]) : "");
    case "requester":
      return item.createdBy.email;
    case "affiliateOwner":
      return item.affiliateOwner?.displayName || item.affiliateOwner?.email || "";
    case "affiliateLink":
      return item.affiliateLink ? decodeURIComponent(item.affiliateLink) : "";
    default: {
      const _exhaustive: never = columnId;
      return _exhaustive;
    }
  }
}
