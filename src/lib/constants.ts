export const STATUS_LABELS: Record<string, string> = {
  NEW: "Pending",
  FILLED: "Ready",
  CLOSED: "Closed",
};

export const CLOSE_REASONS = [
  "BOUGHT",
  "NOT_BUYING",
  "INVALID",
  "STALE",
  "OTHER",
] as const;

export const CLOSE_REASON_LABELS: Record<string, string> = {
  BOUGHT: "Bought",
  NOT_BUYING: "Not buying",
  INVALID: "Invalid",
  STALE: "Stale",
  OTHER: "Other",
};

export const DEFAULT_PLATFORMS = ["SHOPEE", "TIKTOK", "OTHER"] as const;

export const PLATFORM_LABELS: Record<string, string> = {
  SHOPEE: "Shopee",
  TIKTOK: "TikTok",
  OTHER: "Other",
};

export const DEFAULT_CONFIG = {
  PLATFORMS: "SHOPEE,TIKTOK,OTHER",
  STALE_REQUEST_HOURS: "48",
  DUPLICATE_WINDOW_HOURS: "24",
  BULK_CLOSE_MIN_DAYS: "30",
} as const;

export const MAX_BATCH_SIZE = 50;
export const MAX_NOTE_LENGTH = 2000;
