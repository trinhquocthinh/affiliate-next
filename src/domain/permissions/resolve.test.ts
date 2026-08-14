import { describe, it, expect } from "vitest";
import {
  hasPermission,
  assertPermission,
  canAccessRequest,
  PermissionError,
  Actor,
  RequestResource,
} from "./resolve";

describe("Permissions Matrix (TC-049 to TC-062)", () => {
  const buyer: Actor = { id: "buyer-1", role: "BUYER" };
  const affiliate: Actor = { id: "affiliate-1", role: "AFFILIATE" };
  const master: Actor = { id: "master-1", role: "AFFILIATE_MASTER" };
  const admin: Actor = { id: "admin-1", role: "ADMIN" };

  const unassignedReq: RequestResource = {
    createdById: "buyer-2",
    affiliateOwnerId: null,
  };

  const assignedToOtherReq: RequestResource = {
    createdById: "buyer-2",
    affiliateOwnerId: "affiliate-2",
  };

  const myBuyerReq: RequestResource = {
    createdById: "buyer-1",
    affiliateOwnerId: "affiliate-2",
  };

  it("TC-049: Affiliate thao tác việc người khác giữ -> 403", () => {
    // try to fill a request assigned to another affiliate
    expect(canAccessRequest(affiliate, assignedToOtherReq, "affiliate.fill")).toBe(false);
  });

  it("TC-050: Affiliate nhận việc chưa ai giữ -> cho phép", () => {
    // affiliate can claim unclaimed
    expect(hasPermission(affiliate, "affiliate.claim.unclaimed")).toBe(true);
  });

  it("TC-051: Affiliate override -> 403", () => {
    // affiliate cannot override claim
    expect(hasPermission(affiliate, "affiliate.claim.override")).toBe(false);
  });

  it("TC-052: Master override yêu cầu do người khác giữ -> cho phép", () => {
    expect(hasPermission(master, "affiliate.claim.override")).toBe(true);
    expect(canAccessRequest(master, assignedToOtherReq, "affiliate.claim.override")).toBe(true);
  });

  it("TC-052b: Master thao tác nghiệp vụ trên yêu cầu người khác giữ -> cho phép", () => {
    // MS-5: Master làm được mọi thao tác nghiệp vụ mà không cần chiếm việc trước.
    // Năm ô này từng bị đặt nhầm là "own", buộc Master phải claim.override.
    expect(canAccessRequest(master, assignedToOtherReq, "affiliate.fill")).toBe(true);
    expect(canAccessRequest(master, assignedToOtherReq, "affiliate.note")).toBe(true);
    expect(canAccessRequest(master, assignedToOtherReq, "affiliate.unclaim")).toBe(true);
    expect(canAccessRequest(master, assignedToOtherReq, "affiliate.bulk_close")).toBe(true);
    expect(canAccessRequest(master, assignedToOtherReq, "request.close")).toBe(true);
  });

  it("TC-052c: Affiliate thường vẫn bị chặn đúng năm ô đó", () => {
    // Đối chứng: nới cho Master không được nới nhầm cho Affiliate.
    expect(canAccessRequest(affiliate, assignedToOtherReq, "affiliate.fill")).toBe(false);
    expect(canAccessRequest(affiliate, assignedToOtherReq, "affiliate.note")).toBe(false);
    expect(canAccessRequest(affiliate, assignedToOtherReq, "affiliate.unclaim")).toBe(false);
    expect(canAccessRequest(affiliate, assignedToOtherReq, "affiliate.bulk_close")).toBe(false);
    expect(canAccessRequest(affiliate, assignedToOtherReq, "request.close")).toBe(false);
  });

  it("TC-053: Master vào user.manage -> 403", () => {
    expect(hasPermission(master, "user.manage")).toBe(false);
    expect(() => assertPermission(master, "user.manage")).toThrowError(
      new PermissionError("ERR_FORBIDDEN"),
    );
  });

  it("TC-054: Master vào config.manage -> 403", () => {
    expect(hasPermission(master, "config.manage")).toBe(false);
    expect(() => assertPermission(master, "config.manage")).toThrowError(
      new PermissionError("ERR_FORBIDDEN"),
    );
  });

  it("TC-055: Master vào system.bulk_close -> 403", () => {
    expect(hasPermission(master, "system.bulk_close")).toBe(false);
    expect(() => assertPermission(master, "system.bulk_close")).toThrowError(
      new PermissionError("ERR_FORBIDDEN"),
    );
  });

  it("TC-061: Admin làm mọi thứ AffiliateMaster làm được", () => {
    // Admin override (equivalent to TC-052)
    expect(hasPermission(admin, "affiliate.claim.override")).toBe(true);
    // Admin user.manage
    expect(hasPermission(admin, "user.manage")).toBe(true);
    // Admin config.manage
    expect(hasPermission(admin, "config.manage")).toBe(true);
    // Admin system.bulk_close
    expect(hasPermission(admin, "system.bulk_close")).toBe(true);
  });

  it("TC-056: Buyer xem yêu cầu người khác -> 403", () => {
    // buyer views unassigned request not created by them
    expect(canAccessRequest(buyer, unassignedReq, "request.view")).toBe(false);
  });

  it("TC-057: Buyer đóng yêu cầu của mình -> cho phép", () => {
    expect(canAccessRequest(buyer, myBuyerReq, "request.close")).toBe(true);
  });

  it("TC-058: chưa đăng nhập -> 401, không phải 403", () => {
    const unauthenticated: Actor = null;
    expect(() => assertPermission(unauthenticated, "request.view")).toThrowError(
      new PermissionError("ERR_UNAUTHENTICATED"),
    );
  });

  it("TC-059: gọi thẳng bỏ qua giao diện -> 403", () => {
    // missing permission check
    expect(() => assertPermission(buyer, "user.manage")).toThrowError(
      new PermissionError("ERR_FORBIDDEN"),
    );
  });

  it("TC-060: định danh không tồn tại -> lỗi biên dịch", () => {
    // @ts-expect-error - testing invalid permission
    const result = hasPermission(admin, "invalid.permission");
    expect(result).toBe(false);
  });

  it("TC-062: tài khoản bị vô hiệu hoá gọi bất kỳ điểm cuối nào -> 401", () => {
    // In our system, the API layer should not provide an actor if they are inactive,
    // so actor would be null.
    const inactive: Actor = null;
    expect(() => assertPermission(inactive, "request.view")).toThrowError(
      new PermissionError("ERR_UNAUTHENTICATED"),
    );
  });
});
