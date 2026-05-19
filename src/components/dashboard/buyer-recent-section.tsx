"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CyberCard } from "./cyber-card";
import { StatusBadge, PlatformBadge, StaleBadge } from "@/components/requests/status-badge";
import { RequestDetailDialog } from "@/components/requests/request-detail-dialog";
import { PlusCircleIcon, ArrowRightIcon, ExternalLinkIcon } from "lucide-react";

export type BuyerRecentItem = {
  id: string;
  createdAt: string;
  platform: string;
  productUrlRaw: string;
  productName: string | null;
  affiliateLink: string | null;
  status: string;
  isStale: boolean;
};

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];

export function BuyerRecentSection({
  items,
  range,
  activeStat,
}: {
  items: BuyerRecentItem[];
  range: number;
  activeStat: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleRangeChange(v: string | null) {
    if (!v) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", v);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function openDetail(id: string) {
    setSelectedId(id);
    setDialogOpen(true);
  }

  const filterLabel =
    activeStat === "active"
      ? "Filtered: Pending"
      : activeStat === "ready"
        ? "Filtered: Ready"
        : null;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Recent Requests</h3>
          {filterLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{filterLabel}</p>
          )}
        </div>
        <Select value={String(range)} onValueChange={handleRangeChange}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {RANGE_OPTIONS.find((o) => o.value === String(range))?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <CyberCard className="p-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-(--accent-cyber-soft) text-(--accent-cyber) flex items-center justify-center mb-4">
            <PlusCircleIcon className="h-7 w-7" />
          </div>
          <h4 className="text-base font-semibold mb-1">No requests in this window</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-5">
            Kick off your next batch — your affiliate team will see it within minutes.
          </p>
          <Link href="/buyer">
            <Button className="bg-linear-to-br from-primary to-[#00a877] text-white font-semibold shadow-glow hover:shadow-glow-hover">
              <PlusCircleIcon className="h-5 w-5" />
              Create New Request
            </Button>
          </Link>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40 border-l-2 border-l-transparent hover:border-l-(--accent-cyber)"
                    onClick={() => openDetail(item.id)}
                  >
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {item.productName || item.productUrlRaw}
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={item.platform} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusBadge status={item.status} />
                        {item.isStale && <StaleBadge />}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      {item.affiliateLink ? (
                        <a
                          href={item.affiliateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline text-sm inline-flex items-center gap-1"
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
          <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex justify-end">
            <Link
              href="/buyer/requests"
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
