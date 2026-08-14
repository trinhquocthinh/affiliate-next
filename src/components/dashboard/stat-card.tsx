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

const STAT_ICONS = {
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
  info: "text-primary",
  success: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
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
        "flex min-h-36 flex-col justify-between p-5",
        isActive && "border-primary shadow-[0_0_0_1px_var(--color-primary)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </span>
        <Icon className={cn("h-4 w-4", TONE_ICON[tone])} />
      </div>
      <div className="mt-3">
        <div className="text-3xl leading-none font-bold tabular-nums">{value}</div>
        <div className="mt-2 flex min-h-4 flex-wrap items-center gap-3">
          {typeof deltaDay === "number" && (
            <TrendIndicator delta={deltaDay} label="from yesterday" />
          )}
          {typeof deltaWeek === "number" && (
            <TrendIndicator delta={deltaWeek} label="from last week" />
          )}
        </div>
        {description && <div className="mt-2 text-[12px] text-muted-foreground">{description}</div>}
      </div>
    </CyberCard>
  );
}
