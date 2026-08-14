import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import * as auditModule from "./audit";
import {
  logAuditEvent,
  isOwnershipOverride,
  auditSourceFor,
  closeAuditSourceFor,
  AuditValidationError,
} from "./audit";

const create = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;

describe("SPEC-009 — ghi dấu vết (TC-072..076)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ id: "AUD-1" });
  });

  const master = "master-1";
  const affiliateA = "aff-a";
  const buyer = "buyer-1";

  it("TC-072: Master thay link do A điền -> dấu vết có link cũ và mới", async () => {
    const request = { createdById: buyer, affiliateOwnerId: affiliateA };

    // Master không tạo, cũng không giữ yêu cầu -> đây là thao tác vượt quyền
    expect(isOwnershipOverride(master, request)).toBe(true);

    await logAuditEvent({
      requestId: "REQ-1",
      actorId: master,
      action: "FILL_AFFILIATE_LINK",
      oldValue: { affiliateLink: "https://old.example" },
      newValue: { affiliateLink: "https://new.example" },
      source: "affiliate_ui",
    });

    expect(create).toHaveBeenCalledTimes(1);
    const written = create.mock.calls[0][0].data;
    expect(written.actorId).toBe(master);
    expect(written.oldValue).toEqual({ affiliateLink: "https://old.example" });
    expect(written.newValue).toEqual({ affiliateLink: "https://new.example" });
  });

  it("TC-073: Affiliate điền link cho việc chính mình giữ -> không tính vượt quyền", () => {
    const request = { createdById: buyer, affiliateOwnerId: affiliateA };
    expect(isOwnershipOverride(affiliateA, request)).toBe(false);
  });

  it("TC-074: Buyer sửa mã đơn của chính mình -> vẫn ghi dấu vết (BR-052)", async () => {
    const request = { createdById: buyer, affiliateOwnerId: null };

    // Không vượt quyền...
    expect(isOwnershipOverride(buyer, request)).toBe(false);

    // ...nhưng BR-052 áp cho mọi người, nên vẫn phải ghi.
    await logAuditEvent({
      requestId: "REQ-2",
      actorId: buyer,
      action: "EDIT_ORDER_ID",
      oldValue: { orderId: "ORD-1" },
      newValue: { orderId: "ORD-2" },
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.action).toBe("EDIT_ORDER_ID");
  });

  it("TC-075: bản ghi thiếu actorId -> từ chối, không ghi gì", async () => {
    await expect(
      logAuditEvent({
        requestId: "REQ-3",
        actorId: "",
        action: "CLOSE_REQUEST",
      }),
    ).rejects.toThrow(AuditValidationError);

    expect(create).not.toHaveBeenCalled();
  });

  it("TC-075b: cron được phép không có actorId, nhưng phải khai báo tường minh", async () => {
    // Khai báo rõ là việc của hệ thống -> ghi được
    await logAuditEvent({ systemActor: true, action: "BULK_CLOSE", source: "cron" });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.actorId).toBeUndefined();

    // Quên khai báo -> vẫn bị từ chối như mọi bản ghi thiếu actorId
    create.mockClear();
    await expect(logAuditEvent({ action: "BULK_CLOSE", source: "cron" })).rejects.toThrow(
      AuditValidationError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("TC-076: AuditLog bất biến — module không mở đường sửa hay xoá (BR-050)", () => {
    const exported = Object.keys(auditModule);
    const mutators = exported.filter((name) => /update|delete|remove|edit|patch/i.test(name));
    expect(mutators).toEqual([]);
  });

  it("lỗi hạ tầng không được làm hỏng thao tác nghiệp vụ", async () => {
    create.mockRejectedValueOnce(new Error("connection lost"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      logAuditEvent({ actorId: buyer, action: "CLOSE_REQUEST" }),
    ).resolves.toBeUndefined();

    spy.mockRestore();
  });
});

describe("nhãn nguồn suy từ ma trận, không so sánh vai", () => {
  it("auditSourceFor: chỉ vai nắm user.manage mới là 'admin'", () => {
    expect(auditSourceFor("ADMIN", "buyer_ui")).toBe("admin");
    expect(auditSourceFor("BUYER", "buyer_ui")).toBe("buyer_ui");
    expect(auditSourceFor("AFFILIATE", "affiliate_ui")).toBe("affiliate_ui");
    // Master không quản tài khoản -> không phải nhãn admin
    expect(auditSourceFor("AFFILIATE_MASTER", "affiliate_ui")).toBe("affiliate_ui");
  });

  it("closeAuditSourceFor: giữ nguyên nhãn cũ cho cả bốn vai", () => {
    expect(closeAuditSourceFor("BUYER")).toBe("buyer_ui");
    expect(closeAuditSourceFor("AFFILIATE")).toBe("affiliate_ui");
    expect(closeAuditSourceFor("AFFILIATE_MASTER")).toBe("affiliate_ui");
    expect(closeAuditSourceFor("ADMIN")).toBe("affiliate_ui");
  });
});
