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

export type ConfigFieldDef = {
  key: keyof typeof DEFAULT_CONFIG;
  label: string;
  description: string;
  type: "text" | "number";
};

export const CONFIG_FIELDS: readonly ConfigFieldDef[] = [
  {
    key: "PLATFORMS",
    label: "Platforms",
    description: "Comma-separated list of allowed platforms (e.g. SHOPEE,TIKTOK,OTHER)",
    type: "text",
  },
  {
    key: "STALE_REQUEST_HOURS",
    label: "Stale Request Hours",
    description: "Hours after which a pending request is considered stale",
    type: "number",
  },
  {
    key: "DUPLICATE_WINDOW_HOURS",
    label: "Duplicate Window Hours",
    description: "Hours within which duplicate URL detection is active",
    type: "number",
  },
  {
    key: "BULK_CLOSE_MIN_DAYS",
    label: "Bulk Close Min Days",
    description: "Minimum age in days for bulk close eligibility",
    type: "number",
  },
] as const;
