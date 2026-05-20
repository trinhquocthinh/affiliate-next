import { z } from "zod";
import { MAX_BATCH_SIZE, MAX_NOTE_LENGTH } from "./constants";
import {
  AFFILIATE_COLUMN_IDS,
  MANDATORY_AFFILIATE_COLUMN_IDS,
  type AffiliateColumnId,
} from "./affiliate-columns";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  displayName: z.string().min(1, "Display name is required").max(100).trim(),
});

export const createRequestSchema = z.object({
  productUrl: z.string().url("Invalid URL").refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    "URL must start with http:// or https://",
  ),
  platform: z.enum(["SHOPEE", "TIKTOK", "OTHER"]),
  productName: z.string().max(200).trim().optional(),
  requesterName: z.string().max(100).trim().optional(),
});

export const batchCreateSchema = z.object({
  items: z
    .array(
      z.object({
        productUrl: z.string().url("Invalid URL").refine(
          (url) => url.startsWith("http://") || url.startsWith("https://"),
          "URL must start with http:// or https://",
        ),
        productName: z.string().max(200).trim().optional(),
      }),
    )
    .min(1, "At least one item is required")
    .max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} items per batch`),
  platform: z.enum(["SHOPEE", "TIKTOK", "OTHER"]),
  requesterName: z.string().max(100).trim().optional(),
});

export const fillLinkSchema = z.object({
  affiliateLink: z.string().url("Invalid affiliate link URL").refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    "URL must start with http:// or https://",
  ),
  note: z.string().max(MAX_NOTE_LENGTH).trim().optional(),
  expectedLastUpdatedAt: z.string().datetime("Invalid timestamp"),
});

export const closeRequestSchema = z.object({
  closeReason: z.enum(["BOUGHT", "NOT_BUYING", "INVALID", "STALE", "OTHER"]),
  closeNote: z.string().max(MAX_NOTE_LENGTH).trim().optional(),
  orderId: z.string().max(100).trim().optional(),
  expectedLastUpdatedAt: z.string().datetime("Invalid timestamp"),
}).superRefine((data, ctx) => {
  if (data.closeReason === "BOUGHT" && !data.orderId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Order ID is required when reason is Bought",
      path: ["orderId"],
    });
  }
});

export const editRequestSchema = z.object({
  productUrl: z.string().url("Invalid URL").refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    "URL must start with http:// or https://",
  ).optional(),
  platform: z.enum(["SHOPEE", "TIKTOK", "OTHER"]).optional(),
  productName: z.string().max(200).trim().nullable().optional(),
  expectedLastUpdatedAt: z.string().datetime("Invalid timestamp"),
}).refine(
  (data) => data.productUrl !== undefined || data.platform !== undefined || data.productName !== undefined,
  { message: "At least one field must be provided" },
);

export const claimRequestSchema = z.object({
  unclaim: z.boolean().optional(),
  expectedLastUpdatedAt: z.string().datetime("Invalid timestamp"),
});

export const saveNoteSchema = z.object({
  note: z.string().max(MAX_NOTE_LENGTH).trim(),
  expectedLastUpdatedAt: z.string().datetime("Invalid timestamp"),
});

export const saveBuyerNoteSchema = z.object({
  buyerNote: z.string().max(MAX_NOTE_LENGTH).trim(),
  expectedLastUpdatedAt: z.string().datetime("Invalid timestamp"),
});

export const queueFilterSchema = z.object({
  search: z.string().max(200).trim().optional(),
  statusFilter: z.enum(["OPEN", "NEW", "FILLED", "CLOSED", "ALL"]).default("ALL"),
  buyerId: z.string().optional(),
  sortBy: z.enum(["createdAt", "lastUpdatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const bulkCloseSchema = z.object({
  olderThanDays: z.number().int().positive("Must be a positive number"),
  closeNote: z.string().max(MAX_NOTE_LENGTH).trim().optional(),
  dryRun: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const updateConfigSchema = z
  .object({
    key: z.string().min(1),
    value: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.key === "AFFILIATE_ALLOWED_COLUMNS") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.value);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "AFFILIATE_ALLOWED_COLUMNS must be a JSON-encoded string array",
          path: ["value"],
        });
        return;
      }
      if (!Array.isArray(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "AFFILIATE_ALLOWED_COLUMNS must be a JSON array",
          path: ["value"],
        });
        return;
      }
      const allowedIds = new Set<string>(AFFILIATE_COLUMN_IDS);
      for (const id of parsed) {
        if (typeof id !== "string" || !allowedIds.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown affiliate column id: ${String(id)}`,
            path: ["value"],
          });
          return;
        }
      }
    }
  });

const affiliateColumnIdSchema = z.enum(
  AFFILIATE_COLUMN_IDS as readonly [AffiliateColumnId, ...AffiliateColumnId[]],
);

export const columnPreferencesSchema = z
  .array(
    z.object({
      id: affiliateColumnIdSchema,
      visible: z.boolean(),
      order: z.number().int().min(0),
    }),
  )
  .max(AFFILIATE_COLUMN_IDS.length, "Too many column entries")
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    const orders = new Set<number>();
    for (const entry of data) {
      if (ids.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate column id: ${entry.id}`,
        });
        return;
      }
      ids.add(entry.id);
      if (orders.has(entry.order)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate order value: ${entry.order}`,
        });
        return;
      }
      orders.add(entry.order);
    }
    for (const mandatoryId of MANDATORY_AFFILIATE_COLUMN_IDS) {
      const entry = data.find((d) => d.id === mandatoryId);
      if (entry && !entry.visible) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Column "${mandatoryId}" cannot be hidden`,
        });
        return;
      }
    }
  });

export const adminCorrectSchema = z.object({
  orderId: z.string().max(100).trim().nullable().optional(),
  buyerNote: z.string().max(MAX_NOTE_LENGTH).trim().nullable().optional(),
}).refine((data) => data.orderId !== undefined || data.buyerNote !== undefined, {
  message: "At least one field (orderId or buyerNote) must be provided",
});

export const updateUserSchema = z.object({
  role: z.enum(["BUYER", "AFFILIATE", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "REJECTED", "DELETED"]).optional(),
  displayName: z.string().max(100).trim().optional(),
});

export const userActionSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT", "DELETE", "REOPEN"]),
    reason: z.string().max(1000).trim().optional(),
  })
  .refine(
    (data) =>
      data.action !== "REJECT" ||
      (typeof data.reason === "string" && data.reason.length > 0),
    { message: "Reason is required when rejecting a user", path: ["reason"] },
  );
