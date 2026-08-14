import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Subtle trend chip: "+2 from yesterday", "-1 from last week", or muted "no change".
 * "delta" represents rows-created in the window vs the prior window.
 */
export function TrendIndicator({
  delta,
  label,
  className,
}: {
  delta: number;
  label: string; // e.g. "from yesterday" / "from last week"
  className?: string;
}) {
  const isUp = delta > 0;
  const isDown = delta < 0;
  const Icon = isUp ? ArrowUpIcon : isDown ? ArrowDownIcon : MinusIcon;

  // For "creation" deltas, going up is informational (more activity) — render
  // green for up, rose for down so it reads as positive/negative momentum.
  const tone = isUp
    ? "text-emerald-600 dark:text-emerald-400"
    : isDown
      ? "text-rose-600 dark:text-rose-400"
      : "text-muted-foreground";

  const sign = isUp ? "+" : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-medium tabular-nums",
        tone,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      <span>
        {sign}
        {delta}
      </span>
      <span className="font-normal text-muted-foreground">{label}</span>
    </span>
  );
}
