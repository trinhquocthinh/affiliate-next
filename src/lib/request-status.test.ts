import { describe, it, expect } from "vitest";
import { statusLabel, computeRequestPermissions } from "./request-status";

describe("statusLabel", () => {
  it("maps known statuses to their display label", () => {
    expect(statusLabel("NEW")).toBe("Pending");
    expect(statusLabel("FILLED")).toBe("Ready");
    expect(statusLabel("CLOSED")).toBe("Closed");
  });

  it("falls back to the raw value for unknown statuses", () => {
    expect(statusLabel("WEIRD")).toBe("WEIRD");
  });
});

describe("computeRequestPermissions", () => {
  const buyer = { email: "buyer@test.com", role: "BUYER" };
  const otherBuyer = { email: "other@test.com", role: "BUYER" };
  const affiliate = { email: "aff@test.com", role: "AFFILIATE" };
  const admin = { email: "admin@test.com", role: "ADMIN" };

  const mockHasPermission = (role: string, perm: string) => {
    if (role === "ADMIN") return true;
    if (role === "AFFILIATE" && (perm === "affiliate.fill" || perm === "affiliate.note")) return true;
    return false;
  };
  const mockGetPermissionScope = (role: string, perm: string) => {
    if (role === "ADMIN") return "any";
    if (role === "BUYER" && perm === "request.edit") return "own";
    return undefined;
  };

  const computeFor = (data: any, actorObj: any) => {
    return computeRequestPermissions(
      data,
      actorObj,
      (perm) => mockHasPermission(actorObj.role, perm),
      (perm) => mockGetPermissionScope(actorObj.role, perm) as any
    );
  };

  it("returns all-false when there is no data", () => {
    expect(computeFor(null, buyer)).toEqual({
      isOwner: false,
      canBuyerEdit: false,
      canAffiliateAct: false,
      canAdminCorrect: false,
    });
  });

  it("lets the owner edit an open request but not act as affiliate", () => {
    const data = { status: "NEW", closeReason: null, createdBy: { email: buyer.email } };
    const perms = computeFor(data, buyer);
    expect(perms.isOwner).toBe(true);
    expect(perms.canBuyerEdit).toBe(true);
    expect(perms.canAffiliateAct).toBe(false);
    expect(perms.canAdminCorrect).toBe(false);
  });

  it("blocks a non-owner, non-admin buyer from editing", () => {
    const data = { status: "NEW", closeReason: null, createdBy: { email: buyer.email } };
    const perms = computeFor(data, otherBuyer);
    expect(perms.isOwner).toBe(false);
    expect(perms.canBuyerEdit).toBe(false);
  });

  it("lets an affiliate act on an open request only", () => {
    const data = { status: "NEW", closeReason: null, createdBy: { email: buyer.email } };
    expect(computeFor(data, affiliate).canAffiliateAct).toBe(true);

    const closed = { status: "CLOSED", closeReason: "BOUGHT", createdBy: { email: buyer.email } };
    expect(computeFor(closed, affiliate).canAffiliateAct).toBe(false);
  });

  it("never allows editing a closed request, even for admins", () => {
    const closed = { status: "CLOSED", closeReason: "BOUGHT", createdBy: { email: buyer.email } };
    expect(computeFor(closed, admin).canBuyerEdit).toBe(false);
  });

  it("requires status CLOSED and closeReason BOUGHT for admin correction", () => {
    const boughtClosed = { status: "CLOSED", closeReason: "BOUGHT", createdBy: { email: buyer.email } };
    expect(computeFor(boughtClosed, admin).canAdminCorrect).toBe(true);

    const notBoughtClosed = { status: "CLOSED", closeReason: "NOT_BUYING", createdBy: { email: buyer.email } };
    expect(computeFor(notBoughtClosed, admin).canAdminCorrect).toBe(false);

    const stillOpen = { status: "NEW", closeReason: null, createdBy: { email: buyer.email } };
    expect(computeFor(stillOpen, admin).canAdminCorrect).toBe(false);
  });

  it("denies admin correction for a non-admin actor", () => {
    const boughtClosed = { status: "CLOSED", closeReason: "BOUGHT", createdBy: { email: buyer.email } };
    expect(computeFor(boughtClosed, buyer).canAdminCorrect).toBe(false);
  });
});
