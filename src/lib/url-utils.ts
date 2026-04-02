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
