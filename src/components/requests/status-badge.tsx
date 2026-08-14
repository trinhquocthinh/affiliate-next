import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Request status / platform / stale badge with thin outline + colored text.
 * Designed to read correctly in both light and dark themes.
 */

const STATUS_TONES: Record<string, string> = {
  NEW: "border-warning/50 text-warning bg-warning/10",
  FILLED: "border-primary/50 text-primary bg-primary/10",
  CLOSED:
    "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:bg-slate-800/50",
};

const PLATFORM_TONES: Record<string, string> = {
  SHOPEE:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  TIKTOK:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  OTHER:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
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
        "border-destructive/50 bg-destructive/10 font-semibold text-destructive",
        className,
      )}
    >
      Stale
    </Badge>
  );
}
