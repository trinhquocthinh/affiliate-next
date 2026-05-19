import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Request status / platform / stale badge with thin outline + colored text.
 * Designed to read correctly in both light and dark themes.
 */

const STATUS_TONES: Record<string, string> = {
  NEW: "border-amber-400/50 text-amber-700 bg-amber-50 dark:border-amber-400/40 dark:text-amber-300 dark:bg-amber-950/40",
  FILLED:
    "border-emerald-500/50 text-emerald-700 bg-emerald-50 dark:border-emerald-400/40 dark:text-emerald-300 dark:bg-emerald-950/40",
  CLOSED:
    "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:bg-slate-800/50",
};

const PLATFORM_TONES: Record<string, string> = {
  SHOPEE:
    "border-orange-400/50 text-orange-700 bg-orange-50 dark:border-orange-400/40 dark:text-orange-300 dark:bg-orange-950/40",
  TIKTOK:
    "border-sky-400/50 text-sky-700 bg-sky-50 dark:border-sky-400/40 dark:text-sky-300 dark:bg-sky-950/40",
  OTHER:
    "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:bg-slate-800/50",
};

function statusLabel(status: string) {
  if (status === "NEW") return "Pending";
  if (status === "FILLED") return "Ready";
  if (status === "CLOSED") return "Closed";
  return status;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold", STATUS_TONES[status] ?? STATUS_TONES.CLOSED, className)}
    >
      {statusLabel(status)}
    </Badge>
  );
}

export function PlatformBadge({ platform, className }: { platform: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold", PLATFORM_TONES[platform] ?? PLATFORM_TONES.OTHER, className)}
    >
      {platform}
    </Badge>
  );
}

export function StaleBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold border-rose-400/50 text-rose-700 bg-rose-50 dark:border-rose-400/40 dark:text-rose-300 dark:bg-rose-950/40",
        className,
      )}
    >
      Stale
    </Badge>
  );
}
