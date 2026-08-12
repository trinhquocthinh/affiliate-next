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
import {
  SearchIcon,
  DownloadIcon,
  Columns3Icon,
} from "lucide-react";
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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      {/* Search */}
      <div className="relative w-full lg:flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <Input
          placeholder="Search requestsId, product name, requester name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 shadow-sm h-10.5"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangeFilter
          createdFrom={createdFrom}
          createdTo={createdTo}
          onChange={onDateRangeChange}
        />
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v ?? "ALL")} disabled={fetching}>
          <SelectTrigger className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl h-10.5! focus:ring-emerald-500 w-30 shadow-sm">
            <SelectValue>
              {({ ALL: "All Status", OPEN: "Open", NEW: "Pending", FILLED: "Ready", CLOSED: "Closed" } as Record<string, string>)[statusFilter] ?? "All Status"}
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

        <Select value={buyerFilter} onValueChange={(v) => onBuyerFilterChange(v ?? "ALL")} disabled={fetching}>
          <SelectTrigger className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl h-10.5! focus:ring-emerald-500 w-32.5 shadow-sm">
            <SelectValue>
              {buyerFilter === "ALL"
                ? "All Buyers"
                : (buyers.find((b) => b.id === buyerFilter)?.displayName ||
                  buyers.find((b) => b.id === buyerFilter)?.email ||
                  "All Buyers")}
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

        <Select value={sortValue} onValueChange={(v) => onSortChange(v ?? "createdAt:desc")} disabled={fetching}>
          <SelectTrigger className="bg-white dark:bg-[#131B2F] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl h-10.5! focus:ring-emerald-500 w-47.5 shadow-sm">
            <SelectValue>
              {SORT_OPTIONS.find((o) => o.value === sortValue)?.label}
            </SelectValue>
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
                className="bg-white hover:bg-slate-50 dark:bg-[#131B2F] dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm text-xs h-10.5"
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
          className="bg-white hover:bg-slate-50 dark:bg-[#131B2F] dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm text-xs h-10.5"
        >
          <DownloadIcon size={14} className="mr-2" />
          {exporting ? "Exporting..." : "CSV"}
        </Button>
      </div>
    </div>
  );
}
