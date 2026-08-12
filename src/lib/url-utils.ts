const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "msclkid",
  "twclid",
  "li_fat_id",
  "mc_cid",
  "mc_eid",
  "igshid",
  "s_kwcid",
  "ef_id",
  "_ga",
  "_gl",
  "ref",
  "ref_",
  "spm",
  "scm",
  "pvid",
  "clickid",
  "click_id",
  "aff_id",
  "aff_sub",
  "aff_click_id",
]);

/**
 * Normalize a product URL by removing tracking parameters, fragments, and
 * normalizing the hostname to lowercase.
 */
export function normalizeProductUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());

    // Remove tracking params
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (shouldIgnoreParam(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => parsed.searchParams.delete(key));

    // Sort remaining params for consistent comparison
    parsed.searchParams.sort();

    // Remove fragment
    parsed.hash = "";

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove trailing slash from pathname
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, return original trimmed
    return url.trim().toLowerCase();
  }
}

function shouldIgnoreParam(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    TRACKING_PARAMS.has(lower) ||
    lower.startsWith("utm_") ||
    lower.startsWith("__")
  );
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

const SHOPEE_DOMAINS = new Set([
  "shopee.vn",
  "shopee.sg",
  "shopee.com.my",
  "shopee.ph",
  "shopee.co.th",
  "shopee.co.id",
  "shopee.tw",
  "shopee.com.br",
  "shopee.com.mx",
  "shopee.com.co",
  "shopee.cl",
]);

export const SHORTLINK_DOMAINS = new Set([
  // Shopee shortlinks
  "s.shopee.vn",
  "shp.ee",
  // TikTok shortlinks
  "vm.tiktok.com",
  "vt.tiktok.com",
  // Generic shortlink services
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "buff.ly",
  "is.gd",
  "rb.gy",
  "cutt.ly",
  "tiny.cc",
  "short.io",
  "soo.gd",
]);

export type DetectedPlatform = "SHOPEE" | "TIKTOK" | "OTHER";

export type UrlDetectionResult = {
  platform: DetectedPlatform | null;
  isShortlink: boolean;
  errorMessage?: string;
};

/**
 * Detect the platform of a product URL and validate it.
 * Returns null platform for empty input (no validation needed yet).
 */
export function detectPlatformFromUrl(url: string): UrlDetectionResult {
  const trimmed = url.trim();
  if (!trimmed) {
    return { platform: null, isShortlink: false };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { platform: null, isShortlink: false, errorMessage: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { platform: null, isShortlink: false, errorMessage: "Invalid URL format" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // if (SHORTLINK_DOMAINS.has(hostname)) {
  //   // Try to give a platform hint even for shortlinks
  //   let platform: DetectedPlatform | null = null;
  //   if (hostname === "shp.ee" || hostname === "s.shopee.vn") platform = "SHOPEE";
  //   else if (hostname === "vm.tiktok.com" || hostname === "vt.tiktok.com") platform = "TIKTOK";
  //   return {
  //     platform,
  //     isShortlink: true,
  //     errorMessage: "Shortlinks are not supported. Please use the full product URL.",
  //   };
  // }

  // Check exact Shopee domain or subdomain
  const isShopee =
    SHOPEE_DOMAINS.has(hostname) ||
    [...SHOPEE_DOMAINS].some((d) => hostname.endsWith("." + d));
  if (isShopee) {
    return { platform: "SHOPEE", isShortlink: false };
  }

  // TikTok: any *.tiktok.com that wasn't caught by shortlinks above
  if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) {
    return { platform: "TIKTOK", isShortlink: false };
  }

  return { platform: "OTHER", isShortlink: false };
}

export function extractProductItemId(url: string, platform: string): string | null {
  if (platform === "SHOPEE") {
    const match = /i\.(\d+)\.(\d+)/.exec(url);
    if (match && match[2]) {
      return match[2];
    }
  }
  return null;
}
