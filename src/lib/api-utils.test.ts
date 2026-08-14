/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

vi.mock("@/lib/auth-utils", () => ({
  getApiActorContext: vi.fn(),
  assertApiPermission: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
      public httpStatus: number = 400,
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    request: {
      findUnique: vi.fn(),
    },
    reconciliationRun: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/domain/permissions/resolve", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/domain/permissions/resolve")>();
  return {
    ...actual,
    canAccessRequest: vi.fn(),
  };
});

import {
  requireApiAuth,
  checkRequestRateLimit,
  checkOptimisticLock,
  parseBody,
  getAccessibleRequest,
  findReconciliationRunOrError,
  parseAuthenticatedRequest,
} from "./api-utils";
import { getApiActorContext } from "./auth-utils";
import { prisma } from "./prisma";
import { canAccessRequest } from "@/domain/permissions/resolve";

describe("api-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireApiAuth", () => {
    it("trả về 401 khi người dùng chưa đăng nhập", async () => {
      vi.mocked(getApiActorContext).mockResolvedValue(null);

      const result = await requireApiAuth("affiliate.queue.view");
      expect(result.actor).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(401);

      const json = await result.error?.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("trả về actor khi người dùng đã đăng nhập và không yêu cầu quyền cụ thể", async () => {
      const mockActor = {
        userId: "u1",
        email: "user@test.com",
        role: "BUYER" as const,
        displayName: "Test Buyer",
      };
      vi.mocked(getApiActorContext).mockResolvedValue(mockActor);

      const result = await requireApiAuth();
      expect(result.actor).toEqual(mockActor);
      expect(result.error).toBeNull();
    });

    it("trả về actor khi người dùng có quyền hợp lệ", async () => {
      const mockActor = {
        userId: "u1",
        email: "affiliate@test.com",
        role: "AFFILIATE" as const,
        displayName: "Test Affiliate",
      };
      vi.mocked(getApiActorContext).mockResolvedValue(mockActor);

      const result = await requireApiAuth("affiliate.queue.view");
      expect(result.actor).toEqual(mockActor);
      expect(result.error).toBeNull();
    });

    it("trả về 403 khi người dùng không đủ quyền", async () => {
      const mockActor = {
        userId: "u1",
        email: "buyer@test.com",
        role: "BUYER" as const,
        displayName: "Test Buyer",
      };
      vi.mocked(getApiActorContext).mockResolvedValue(mockActor);

      const result = await requireApiAuth("affiliate.queue.view");
      expect(result.actor).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(403);

      const json = await result.error?.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });
  });

  describe("checkRequestRateLimit", () => {
    it("cho phép request khi chưa vượt giới hạn", () => {
      const req = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "123.45.67.89" },
      });

      const res = checkRequestRateLimit(req, { limit: 5, windowSecs: 60 });
      expect(res).toBeNull();
    });

    it("chặn và trả về 429 khi vượt giới hạn", () => {
      const ip = "192.168.1.100";
      const req = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": ip },
      });

      // Gọi 3 lần với limit = 2
      checkRequestRateLimit(req, { limit: 2, windowSecs: 60 });
      checkRequestRateLimit(req, { limit: 2, windowSecs: 60 });
      const blockedRes = checkRequestRateLimit(req, { limit: 2, windowSecs: 60 });

      expect(blockedRes).not.toBeNull();
      expect(blockedRes?.status).toBe(429);
      expect(blockedRes?.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("checkOptimisticLock", () => {
    it("trả về null khi thời gian khớp", () => {
      const date = new Date("2026-08-14T10:00:00Z");
      const existing = { lastUpdatedAt: date };

      const res = checkOptimisticLock(existing, date.toISOString());
      expect(res).toBeNull();
    });

    it("trả về 409 khi thời gian lệch quá 1 giây", async () => {
      const date = new Date("2026-08-14T10:00:00Z");
      const existing = { lastUpdatedAt: new Date("2026-08-14T10:00:05Z") };

      const res = checkOptimisticLock(existing, date.toISOString());
      expect(res).not.toBeNull();
      expect(res?.status).toBe(409);

      const json = await res?.json();
      expect(json.error.code).toBe("CONFLICT_STALE_WRITE");
    });
  });

  describe("parseBody", () => {
    const testSchema = z.object({
      name: z.string().min(3),
      count: z.number().int().positive(),
    });

    it("trả về data khi body hợp lệ", async () => {
      const req = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", count: 5 }),
      });

      const res = await parseBody(req, testSchema);
      expect("data" in res).toBe(true);
      if ("data" in res) {
        expect(res.data).toEqual({ name: "Alice", count: 5 });
      }
    });

    it("trả về 400 khi JSON sai cú pháp", async () => {
      const req = new Request("http://localhost/api/test", {
        method: "POST",
        body: "invalid-json",
      });

      const res = await parseBody(req, testSchema);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error.status).toBe(400);
      }
    });

    it("trả về 400 khi dữ liệu không khớp schema", async () => {
      const req = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ name: "Al", count: -1 }),
      });

      const res = await parseBody(req, testSchema);
      expect("error" in res).toBe(true);
      if ("error" in res) {
        expect(res.error.status).toBe(400);
      }
    });
  });

  describe("getAccessibleRequest", () => {
    const mockActor = { id: "u1", role: "AFFILIATE" as const };
    const baseRequest = {
      id: "req-1",
      status: "OPEN" as const,
      lastUpdatedAt: new Date("2026-08-14T10:00:00Z"),
      affiliateOwnerId: "u1",
    };

    it("trả về 404 khi không tìm thấy request", async () => {
      vi.mocked(prisma.request.findUnique).mockResolvedValue(null);

      const res = await getAccessibleRequest("req-not-found", mockActor);
      expect(res.request).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.status).toBe(404);
    });

    it("trả về 403 khi actor không đủ quyền canAccessRequest", async () => {
      vi.mocked(prisma.request.findUnique).mockResolvedValue(baseRequest as any);
      vi.mocked(canAccessRequest).mockReturnValue(false);

      const res = await getAccessibleRequest("req-1", mockActor, "affiliate.fill");
      expect(res.request).toBeNull();
      expect(res.error?.status).toBe(403);
    });

    it("trả về 400 khi request đã đóng và không có cờ allowClosed", async () => {
      vi.mocked(prisma.request.findUnique).mockResolvedValue({
        ...baseRequest,
        status: "CLOSED",
      } as any);
      vi.mocked(canAccessRequest).mockReturnValue(true);

      const res = await getAccessibleRequest("req-1", mockActor, "affiliate.fill");
      expect(res.request).toBeNull();
      expect(res.error?.status).toBe(400);
    });

    it("cho phép request đã đóng khi có cờ allowClosed", async () => {
      const closedReq = { ...baseRequest, status: "CLOSED" as const };
      vi.mocked(prisma.request.findUnique).mockResolvedValue(closedReq as any);
      vi.mocked(canAccessRequest).mockReturnValue(true);

      const res = await getAccessibleRequest("req-1", mockActor, "request.close", {
        allowClosed: true,
      });
      expect(res.error).toBeNull();
      expect(res.request).toEqual(closedReq);
    });

    it("trả về 409 khi expectedLastUpdatedAt bị xung đột", async () => {
      vi.mocked(prisma.request.findUnique).mockResolvedValue(baseRequest as any);
      vi.mocked(canAccessRequest).mockReturnValue(true);

      const res = await getAccessibleRequest("req-1", mockActor, "affiliate.fill", {
        expectedLastUpdatedAt: "2026-08-14T09:00:00Z",
      });
      expect(res.request).toBeNull();
      expect(res.error?.status).toBe(409);
    });

    it("trả về request khi hợp lệ tất cả điều kiện", async () => {
      vi.mocked(prisma.request.findUnique).mockResolvedValue(baseRequest as any);
      vi.mocked(canAccessRequest).mockReturnValue(true);

      const res = await getAccessibleRequest("req-1", mockActor, "affiliate.fill", {
        expectedLastUpdatedAt: "2026-08-14T10:00:00Z",
      });
      expect(res.error).toBeNull();
      expect(res.request).toEqual(baseRequest);
    });
  });

  describe("parseAuthenticatedRequest", () => {
    const testSchema = z.object({ note: z.string() });

    it("trả về 401 khi auth thất bại", async () => {
      vi.mocked(getApiActorContext).mockResolvedValue(null);

      const req = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ note: "Hello" }),
      });
      const res = await parseAuthenticatedRequest(req, Promise.resolve({ id: "123" }), testSchema);
      expect(res.error).not.toBeNull();
      expect(res.error?.status).toBe(401);
    });

    it("trả về 400 khi body sai schema", async () => {
      vi.mocked(getApiActorContext).mockResolvedValue({
        userId: "u1",
        email: "user@test.com",
        role: "BUYER" as const,
        displayName: "User",
      });

      const req = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ wrong: 123 }),
      });
      const res = await parseAuthenticatedRequest(req, Promise.resolve({ id: "123" }), testSchema);
      expect(res.error).not.toBeNull();
      expect(res.error?.status).toBe(400);
    });

    it("trả về id, actor, data khi thành công", async () => {
      vi.mocked(getApiActorContext).mockResolvedValue({
        userId: "u1",
        email: "user@test.com",
        role: "BUYER" as const,
        displayName: "User",
      });

      const req = new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ note: "Valid note" }),
      });
      const res = await parseAuthenticatedRequest(req, Promise.resolve({ id: "123" }), testSchema);
      expect(res.error).toBeNull();
      expect(res.id).toBe("123");
      expect(res.data).toEqual({ note: "Valid note" });
      expect(res.actor).toEqual({ id: "u1", role: "BUYER" });
    });
  });

  describe("findReconciliationRunOrError", () => {
    it("trả về 404 khi không tìm thấy run", async () => {
      vi.mocked(prisma.reconciliationRun.findUnique).mockResolvedValue(null);

      const res = await findReconciliationRunOrError("run-404");
      expect(res.run).toBeNull();
      expect(res.error?.status).toBe(404);
    });

    it("trả về run khi tìm thấy", async () => {
      const mockRun = { id: "run-1", filename: "test.csv" };
      vi.mocked(prisma.reconciliationRun.findUnique).mockResolvedValue(mockRun as any);

      const res = await findReconciliationRunOrError("run-1");
      expect(res.error).toBeNull();
      expect(res.run).toEqual(mockRun);
    });
  });
});
