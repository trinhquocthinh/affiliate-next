/**
 * Single source of truth for the customizable Affiliate Queue columns.
 *
 * - `id` is the mandatory anchor column: it is always allowed, always visible,
 *   and cannot be reordered to a non-leading position.
 * - The order of `AFFILIATE_COLUMNS` is the default display order for a brand
 *   new user (no `columnPreferences` saved yet).
 * - All other modules (admin gating, user prefs, table render, CSV export) MUST
 *   consume this catalog so the schemas, UI, and CSV cannot drift.
 */

export type AffiliateColumnId =
  | "id"
  | "orderId"
  | "createdAt"
  | "platform"
  | "status"
  | "productName"
  | "requester"
  | "affiliateOwner"
  | "affiliateLink";

export type AffiliateColumnDef = {
  id: AffiliateColumnId;
  label: string;
  /** Mandatory columns are always allowed and always visible. */
  mandatory?: boolean;
};

export const AFFILIATE_COLUMNS: readonly AffiliateColumnDef[] = [
  { id: "id", label: "ID", mandatory: true },
  { id: "orderId", label: "Order ID" },
  { id: "createdAt", label: "Created" },
  { id: "platform", label: "Platform" },
  { id: "status", label: "Status" },
  { id: "productName", label: "Product" },
  { id: "requester", label: "Requester" },
  { id: "affiliateOwner", label: "Affiliate Owner" },
  { id: "affiliateLink", label: "Affiliate Link" },
] as const;

export const AFFILIATE_COLUMN_IDS: readonly AffiliateColumnId[] = AFFILIATE_COLUMNS.map(
  (c) => c.id,
);

export const MANDATORY_AFFILIATE_COLUMN_IDS: readonly AffiliateColumnId[] =
  AFFILIATE_COLUMNS.filter((c) => c.mandatory).map((c) => c.id);

function isAffiliateColumnId(value: unknown): value is AffiliateColumnId {
  return typeof value === "string" && (AFFILIATE_COLUMN_IDS as readonly string[]).includes(value);
}

export type ColumnPreference = {
  id: AffiliateColumnId;
  visible: boolean;
  order: number;
};

export type EffectiveColumn = AffiliateColumnDef & {
  visible: boolean;
  order: number;
};

/**
 * Default allowed-columns set. When admin has not configured the key, every
 * column is permitted.
 */
export function getDefaultAllowedColumnIds(): AffiliateColumnId[] {
  return [...AFFILIATE_COLUMN_IDS];
}

/**
 * Parse the `AFFILIATE_ALLOWED_COLUMNS` JSON-stringified value from AppConfig.
 * Falls back to "all allowed" when the value is missing or invalid. Mandatory
 * column ids are always forced into the result.
 */
export function parseAllowedColumns(raw: string | null | undefined): AffiliateColumnId[] {
  if (!raw) return getDefaultAllowedColumnIds();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getDefaultAllowedColumnIds();
    const filtered = parsed.filter(isAffiliateColumnId);
    const set = new Set<AffiliateColumnId>(filtered);
    for (const id of MANDATORY_AFFILIATE_COLUMN_IDS) set.add(id);
    // Preserve catalog order for stable output.
    return AFFILIATE_COLUMN_IDS.filter((id) => set.has(id));
  } catch {
    return getDefaultAllowedColumnIds();
  }
}

/**
 * Default preferences = all catalog columns visible in catalog order.
 */
export function getDefaultPreferences(): ColumnPreference[] {
  return AFFILIATE_COLUMNS.map((c, idx) => ({ id: c.id, visible: true, order: idx }));
}

/**
 * Coerce a value from `User.columnPreferences` (Prisma JSON) into a clean array.
 * Drops unknown ids, deduplicates, and re-numbers `order` from 0. Invalid input
 * returns the catalog defaults.
 */
export function parseColumnPreferences(raw: unknown): ColumnPreference[] {
  if (!Array.isArray(raw)) return getDefaultPreferences();
  const seen = new Set<AffiliateColumnId>();
  const cleaned: ColumnPreference[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as { id?: unknown; visible?: unknown; order?: unknown };
    if (!isAffiliateColumnId(e.id)) continue;
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    cleaned.push({
      id: e.id,
      visible: e.visible !== false,
      order: typeof e.order === "number" ? e.order : cleaned.length,
    });
  }
  if (cleaned.length === 0) return getDefaultPreferences();
  cleaned.sort((a, b) => a.order - b.order);
  return cleaned.map((c, idx) => ({ ...c, order: idx }));
}

/**
 * Merge admin-allowed columns with user preferences into the final rendered
 * column list.
 *
 * Rules:
 * - Disallowed columns are dropped entirely (no entry returned).
 * - Mandatory columns are always present, always visible, and pinned to the
 *   front (catalog order among mandatories).
 * - Allowed-but-not-in-prefs columns are appended at the end, visible by
 *   default.
 * - `order` is renumbered from 0 in the returned array.
 */
export function resolveEffectiveColumns(
  allowed: readonly AffiliateColumnId[],
  prefs: readonly ColumnPreference[],
): EffectiveColumn[] {
  const allowedSet = new Set(allowed);
  // Always keep mandatory columns allowed.
  for (const id of MANDATORY_AFFILIATE_COLUMN_IDS) allowedSet.add(id);

  const defByid = new Map<AffiliateColumnId, AffiliateColumnDef>();
  for (const def of AFFILIATE_COLUMNS) defByid.set(def.id, def);

  // 1) Start with user pref order, filtered to allowed.
  const seen = new Set<AffiliateColumnId>();
  const ordered: ColumnPreference[] = [];
  for (const p of [...prefs].sort((a, b) => a.order - b.order)) {
    if (!allowedSet.has(p.id)) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    ordered.push(p);
  }
  // 2) Append any allowed columns missing from prefs, in catalog order.
  for (const def of AFFILIATE_COLUMNS) {
    if (!allowedSet.has(def.id)) continue;
    if (seen.has(def.id)) continue;
    seen.add(def.id);
    ordered.push({ id: def.id, visible: true, order: ordered.length });
  }

  // 3) Force mandatory columns to be visible and pinned to the front.
  const mandatory: ColumnPreference[] = [];
  const rest: ColumnPreference[] = [];
  for (const p of ordered) {
    const def = defByid.get(p.id);
    if (!def) continue;
    if (def.mandatory) {
      mandatory.push({ ...p, visible: true });
    } else {
      rest.push(p);
    }
  }
  // Mandatory columns keep catalog order.
  mandatory.sort(
    (a, b) =>
      MANDATORY_AFFILIATE_COLUMN_IDS.indexOf(a.id) - MANDATORY_AFFILIATE_COLUMN_IDS.indexOf(b.id),
  );

  const final = [...mandatory, ...rest];
  return final.map((p, idx) => {
    const def = defByid.get(p.id)!;
    return {
      ...def,
      visible: p.visible,
      order: idx,
    };
  });
}
