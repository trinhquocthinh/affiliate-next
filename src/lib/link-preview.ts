const SHOPEE_ITEM_REGEX = /i\.(\d+)\.(\d+)/;
const SHOPEE_REGIONS: Record<string, string> = {
  "shopee.vn": "vn",
  "shopee.sg": "sg",
  "shopee.com.my": "my",
  "shopee.ph": "ph",
  "shopee.co.th": "th",
  "shopee.co.id": "id",
  "shopee.tw": "tw",
  "shopee.com.br": "br",
  "shopee.com.mx": "mx",
  "shopee.com.co": "co",
  "shopee.cl": "cl",
};

export type LinkPreview = {
  title?: string;
  imageUrl?: string;
};

// Simple in-memory cache with TTL
const previewCache = new Map<string, { data: LinkPreview; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function getLinkPreview(url: string): Promise<LinkPreview> {
  const cached = previewCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    // Validate URL to prevent SSRF
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {};
    }

    // Block private/internal IPs
    const hostname = parsed.hostname.toLowerCase();
    if (isPrivateHost(hostname)) {
      return {};
    }

    // Check if it's a Shopee URL — use special handler
    const shopeePreview = await tryShopeePreview(url, parsed);
    if (shopeePreview) {
      previewCache.set(url, { data: shopeePreview, expiresAt: Date.now() + CACHE_TTL_MS });
      return shopeePreview;
    }

    // Generic HTML meta scraping
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkPreview/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) return {};

    const html = await response.text();
    const preview = parseHtmlMeta(html);

    previewCache.set(url, { data: preview, expiresAt: Date.now() + CACHE_TTL_MS });
    return preview;
  } catch {
    return {};
  }
}

function parseHtmlMeta(html: string): LinkPreview {
  const result: LinkPreview = {};

  // Extract title
  const ogTitle = extractMetaContent(html, 'property="og:title"') || extractMetaContent(html, 'name="twitter:title"');
  const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  result.title = ogTitle || htmlTitle?.trim();

  // Extract image
  const ogImage = extractMetaContent(html, 'property="og:image"') || extractMetaContent(html, 'name="twitter:image"');
  if (ogImage) {
    result.imageUrl = ogImage;
  }

  return result;
}

function extractMetaContent(html: string, attr: string): string | undefined {
  const regex = new RegExp(`<meta[^>]+${attr}[^>]+content="([^"]*)"`, "i");
  const altRegex = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr}`, "i");
  return regex.exec(html)?.[1] || altRegex.exec(html)?.[1];
}

async function tryShopeePreview(url: string, parsed: URL): Promise<LinkPreview | null> {
  const region = Object.entries(SHOPEE_REGIONS).find(([domain]) =>
    parsed.hostname.includes(domain),
  )?.[1];

  if (!region) return null;

  const match = SHOPEE_ITEM_REGEX.exec(url);
  if (!match) return null;

  const [, shopId, itemId] = match;

  try {
    const apiUrl = `https://shopee.vn/api/v4/item/get?shopid=${shopId}&itemid=${itemId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkPreview/1.0)",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const item = data?.data;
    if (!item) return null;

    const imageToken = item.image;
    const imageUrl = imageToken
      ? `https://down-${region}.img.susercontent.com/file/${imageToken}`
      : undefined;

    return {
      title: item.name,
      imageUrl,
    };
  } catch {
    return null;
  }
}

function isPrivateHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.startsWith("192.168.") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  );
}
