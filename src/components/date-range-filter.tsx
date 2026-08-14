"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DateRangeFilter({
  createdFrom,
  createdTo,
  onChange,
}: {
  createdFrom: string;
  createdTo: string;
  onChange: (from: string, to: string) => void;
}) {
  const [from, setFrom] = useState(createdFrom);
  const [to, setTo] = useState(createdTo);
  const [open, setOpen] = useState(false);
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFrom(createdFrom);
      setTo(createdTo);
    }
    setOpen(newOpen);
  };

  const handleApply = () => {
    onChange(from, to);
    setOpen(false);
  };

  const handleClear = () => {
    setFrom("");
    setTo("");
    onChange("", "");
    setOpen(false);
  };

  const hasFilter = createdFrom || createdTo;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={`h-10.5 rounded-xl border-slate-200 bg-white text-xs font-medium shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-[#131B2F] dark:hover:bg-slate-800 ${
              hasFilter
                ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                : "text-slate-600 dark:text-slate-300"
            }`}
          />
        }
      >
        <CalendarIcon size={14} className="mr-2 shrink-0" />
        {hasFilter ? (
          <span suppressHydrationWarning className="max-w-40 truncate">
            {createdFrom
              ? new Date(createdFrom).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "Any"}
            {" - "}
            {createdTo
              ? new Date(createdTo).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "Any"}
          </span>
        ) : (
          "Date"
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <h4 className="text-sm leading-none font-medium">Filter by Created Date</h4>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="from" className="text-xs font-medium">
                From
              </label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="to" className="text-xs font-medium">
                To
              </label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-8 flex-1 text-xs"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 flex-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
