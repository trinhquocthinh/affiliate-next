"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useActor } from "@/components/layout/actor-provider";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CyberCard } from "./cyber-card";
import { StatusBadge, PlatformBadge, StaleBadge } from "@/components/requests/status-badge";
import { RequestDetailDialog } from "@/components/requests/request-detail-dialog";
import {
  ArrowRightIcon,
  HandIcon,
  InboxIcon,
  MoreHorizontalIcon,
  EyeIcon,
  UndoIcon,
} from "lucide-react";

export type AffiliateQueueItem = {
  id: string;
  createdAt: string;
  lastUpdatedAt: string;
  platform: string;
  productUrlRaw: string;
  productName: string | null;
  status: string;
  isStale: boolean;
  ageHours: number;
  affiliateOwnerEmail: string | null;
  createdBy: { displayName: string | null; email: string };
};

export function AffiliateQueueSection({
  items,
  activeStat,
}: {
  items: AffiliateQueueItem[];
  activeStat: string | null;
}) {
  const router = useRouter();
  const actor = useActor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function openDetail(id: string) {
    setSelectedId(id);
    setDialogOpen(true);
  }

  async function handleClaim(item: AffiliateQueueItem, unclaim: boolean) {
    try {
      const res = await fetch(`/api/requests/${item.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unclaim: unclaim || undefined,
          expectedLastUpdatedAt: item.lastUpdatedAt,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(unclaim ? "Unclaimed" : "Claimed");
        router.refresh();
      } else {
        toast.error(json.error?.message || "Action failed");
      }
    } catch {
      toast.error("Action failed");
    }
  }

  const filterLabel =
    activeStat === "queue"
      ? "All open requests"
      : activeStat === "stale"
        ? "Stale only"
        : activeStat === "mine"
          ? "Claimed by me"
          : null;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Queue</h3>
          {filterLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{filterLabel}</p>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <CyberCard className="p-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-4">
            <InboxIcon className="h-7 w-7" />
          </div>
          <h4 className="text-base font-semibold mb-1">Nothing here right now</h4>
          <p className="text-sm text-muted-foreground max-w-sm">
            {activeStat === "stale"
              ? "No stale requests. Nice work staying on top of the queue."
              : activeStat === "mine"
                ? "You haven't claimed anything yet."
                : "No open requests in the queue."}
          </p>
        </CyberCard>
      ) : (
        <CyberCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-40">ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isMine = item.affiliateOwnerEmail === actor.email;
                  const isClaimedByOther = !!item.affiliateOwnerEmail && !isMine;
                  return (
                    <TableRow
                      key={item.id}
                      className="group cursor-pointer transition-colors hover:bg-muted/40 border-l-2 border-l-transparent hover:border-l-(--accent-cyber)"
                      onClick={() => openDetail(item.id)}
                    >
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {item.productName || item.productUrlRaw}
                      </TableCell>
                      <TableCell>
                        <PlatformBadge platform={item.platform} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.createdBy.displayName || item.createdBy.email}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <span
                          className={
                            item.isStale
                              ? "text-rose-600 dark:text-rose-400 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <StatusBadge status={item.status} />
                          {item.isStale && <StaleBadge />}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-popup-open:opacity-100"
                                aria-label="Row actions"
                              />
                            }
                          >
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(item.id)}>
                              <EyeIcon className="h-4 w-4" />
                              Open details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isMine ? (
                              <DropdownMenuItem onClick={() => handleClaim(item, true)}>
                                <UndoIcon className="h-4 w-4" />
                                Unclaim
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={isClaimedByOther && !actor.isAdmin}
                                onClick={() => handleClaim(item, false)}
                              >
                                <HandIcon className="h-4 w-4" />
                                {isClaimedByOther ? "Claimed by other" : "Claim"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex justify-end">
            <Link
              href="/affiliate"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              View all <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CyberCard>
      )}

      <RequestDetailDialog
        requestId={selectedId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onMutated={() => router.refresh()}
      />
    </div>
  );
}
