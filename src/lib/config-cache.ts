import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONFIG } from "@/lib/constants";

export type AppConfigMap = {
  STALE_REQUEST_HOURS: number;
  DUPLICATE_WINDOW_HOURS: number;
  BULK_CLOSE_MIN_DAYS: number;
  PLATFORMS: string[];
  DISCORD_WEBHOOK_URL: string | null;
  DISCORD_CURRENT_THREAD_ID: string | null;
  DISCORD_CURRENT_THREAD_DATE: string | null;
};

/**
 * Fetch all AppConfig rows and return a typed map.
 * Cached for 5 minutes via Next.js Data Cache — avoids a DB round-trip on every
 * request that only needs to read config values.
 *
 * Call `revalidateAppConfig()` after any config write so the cache refreshes
 * immediately rather than waiting for the TTL.
 */
export const getAppConfig = unstable_cache(
  async (): Promise<AppConfigMap> => {
    const rows = await prisma.appConfig.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;

    return {
      STALE_REQUEST_HOURS: parseInt(
        map["STALE_REQUEST_HOURS"] ?? DEFAULT_CONFIG.STALE_REQUEST_HOURS,
        10,
      ),
      DUPLICATE_WINDOW_HOURS: parseInt(
        map["DUPLICATE_WINDOW_HOURS"] ?? DEFAULT_CONFIG.DUPLICATE_WINDOW_HOURS,
        10,
      ),
      BULK_CLOSE_MIN_DAYS: parseInt(
        map["BULK_CLOSE_MIN_DAYS"] ?? DEFAULT_CONFIG.BULK_CLOSE_MIN_DAYS,
        10,
      ),
      PLATFORMS: (map["PLATFORMS"] ?? DEFAULT_CONFIG.PLATFORMS).split(",").map((p) => p.trim()),
      DISCORD_WEBHOOK_URL: map["DISCORD_WEBHOOK_URL"] ?? null,
      DISCORD_CURRENT_THREAD_ID: map["DISCORD_CURRENT_THREAD_ID"] ?? null,
      DISCORD_CURRENT_THREAD_DATE: map["DISCORD_CURRENT_THREAD_DATE"] ?? null,
    };
  },
  ["app-config"],
  { revalidate: 300, tags: ["app-config"] }, // 5 minutes
);

/**
 * Invalidate the AppConfig cache. Call this after any PUT /api/config write.
 */
export async function revalidateAppConfig() {
  const { revalidateTag } = await import("next/cache");
  revalidateTag("app-config", { expire: 0 });
}
