"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  InboxIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  UserIcon,
  FileTextIcon,
  BarChart2Icon,
} from "lucide-react";
import { CyberCard } from "./cyber-card";
import { TrendIndicator } from "./trend-indicator";
import { cn } from "@/lib/utils";

export const STAT_ICONS = {
  inbox: InboxIcon,
  check: CheckCircleIcon,
  clock: ClockIcon,
  alert: AlertTriangleIcon,
  user: UserIcon,
  file: FileTextIcon,
  chart: BarChart2Icon,
} as const;

export type StatIconKey = keyof typeof STAT_ICONS;

export type StatTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_ICON: Record<StatTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-sky-600 dark:text-sky-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
};

export function StatCard({
  title,
  value,
  icon,
  description,
  deltaDay,
  deltaWeek,
  statKey,
  tone = "neutral",
  clickable = true,
}: {
  title: string;
  value: number;
  icon: StatIconKey;
  description?: string;
  deltaDay?: number;
  deltaWeek?: number;
  /** When provided + clickable, toggles ?stat=<key> in the URL. */
  statKey?: string;
  tone?: StatTone;
  clickable?: boolean;
}) {
  const Icon = STAT_ICONS[icon];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeStat = searchParams.get("stat");
  const isActive = !!statKey && activeStat === statKey;
  const canClick = clickable && !!statKey;

  function handleClick() {
    if (!canClick) return;
    const params = new URLSearchParams(searchParams.toString());
    if (isActive) params.delete("stat");
    else params.set("stat", statKey!);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <CyberCard
      interactive={canClick}
      onClick={canClick ? handleClick : undefined}
      role={canClick ? "button" : undefined}
      tabIndex={canClick ? 0 : undefined}
      onKeyDown={
        canClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      aria-pressed={canClick ? isActive : undefined}
      className={cn(
        "flex flex-col justify-between min-h-36 p-5",
        isActive &&
          "border-(--accent-cyber) shadow-[0_0_0_1px_var(--accent-cyber-soft)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <Icon className={cn("h-4 w-4", TONE_ICON[tone])} />
      </div>
      <div className="mt-3">
        <div className="text-3xl font-bold tabular-nums leading-none">{value}</div>
        <div className="mt-2 flex items-center gap-3 flex-wrap min-h-4">
          {typeof deltaDay === "number" && (
            <TrendIndicator delta={deltaDay} label="from yesterday" />
          )}
          {typeof deltaWeek === "number" && (
            <TrendIndicator delta={deltaWeek} label="from last week" />
          )}
        </div>
        {description && (
          <div className="text-[12px] text-muted-foreground mt-2">{description}</div>
        )}
      </div>
    </CyberCard>
  );
}
