"use client";

import { DateRangeFilter } from "@/components/date-range-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { SearchIcon, DownloadIcon, Columns3Icon } from "lucide-react";
import { SORT_OPTIONS, type BuyerOption } from "@/lib/affiliate-queue";
import type { AffiliateColumnId } from "@/lib/affiliate-columns";
import type { EffectiveColumn } from "@/lib/affiliate-columns";

export function AffiliateQueueToolbar({
  search,
  onSearchChange,
  createdFrom,
  createdTo,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  buyerFilter,
  onBuyerFilterChange,
  buyers,
  sortValue,
  onSortChange,
  fetching,
  tableColumns,
  onColumnVisibilityChange,
  exporting,
  onExportCSV,
  visibleColumnsCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  createdFrom: string;
  createdTo: string;
  onDateRangeChange: (from: string, to: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  buyerFilter: string;
  onBuyerFilterChange: (value: string) => void;
  buyers: BuyerOption[];
  sortValue: string;
  onSortChange: (value: string) => void;
  fetching: boolean;
  tableColumns: EffectiveColumn[];
  onColumnVisibilityChange: (id: AffiliateColumnId, visible: boolean) => void;
  exporting: boolean;
  onExportCSV: () => void;
  visibleColumnsCount: number;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      {/* Search */}
      <div className="relative w-full lg:flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <Input
          placeholder="Search requestsId, product name, requester name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10.5 rounded-xl border-slate-200 bg-white pl-10 shadow-sm placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-[#131B2F] dark:placeholder:text-slate-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangeFilter
          createdFrom={createdFrom}
          createdTo={createdTo}
          onChange={onDateRangeChange}
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v ?? "ALL")}
          disabled={fetching}
        >
          <SelectTrigger className="h-10.5! w-30 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-sm focus:ring-emerald-500 dark:border-slate-800 dark:bg-[#131B2F] dark:text-slate-300">
            <SelectValue>
              {(
                {
                  ALL: "All Status",
                  OPEN: "Open",
                  NEW: "Pending",
                  FILLED: "Ready",
                  CLOSED: "Closed",
                } as Record<string, string>
              )[statusFilter] ?? "All Status"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="NEW">Pending</SelectItem>
            <SelectItem value="FILLED">Ready</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={buyerFilter}
          onValueChange={(v) => onBuyerFilterChange(v ?? "ALL")}
          disabled={fetching}
        >
          <SelectTrigger className="h-10.5! w-32.5 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-sm focus:ring-emerald-500 dark:border-slate-800 dark:bg-[#131B2F] dark:text-slate-300">
            <SelectValue>
              {buyerFilter === "ALL"
                ? "All Buyers"
                : buyers.find((b) => b.id === buyerFilter)?.displayName ||
                  buyers.find((b) => b.id === buyerFilter)?.email ||
                  "All Buyers"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Buyers</SelectItem>
            {buyers.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.displayName || b.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortValue}
          onValueChange={(v) => onSortChange(v ?? "createdAt:desc")}
          disabled={fetching}
        >
          <SelectTrigger className="h-10.5! w-47.5 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-sm focus:ring-emerald-500 dark:border-slate-800 dark:bg-[#131B2F] dark:text-slate-300">
            <SelectValue>{SORT_OPTIONS.find((o) => o.value === sortValue)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="h-10.5 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-[#131B2F] dark:text-slate-300 dark:hover:bg-slate-800"
              />
            }
          >
            <Columns3Icon size={14} className="mr-2" />
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
              Visible columns
            </div>
            <DropdownMenuSeparator />
            {tableColumns.length === 0 ? (
              <DropdownMenuItem disabled>No columns available</DropdownMenuItem>
            ) : (
              tableColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.visible}
                  disabled={!!col.mandatory}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(checked) => onColumnVisibilityChange(col.id, !!checked)}
                >
                  {col.label}
                  {col.mandatory && (
                    <span className="ml-auto text-[10px] text-slate-400">Required</span>
                  )}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          onClick={onExportCSV}
          disabled={exporting || visibleColumnsCount === 0}
          className="h-10.5 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-[#131B2F] dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <DownloadIcon size={14} className="mr-2" />
          {exporting ? "Exporting..." : "CSV"}
        </Button>
      </div>
    </div>
  );
}
