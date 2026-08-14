import { describe, it, expect } from "vitest";
import { MATRIX, PERMISSIONS, Permission, Role, Scope } from "./matrix";

/**
 * Đối chiếu nguyên văn bảng thẩm quyền ở SDD SPEC-006.
 *
 * Bộ TC-049..062 chỉ chạm vào một phần ma trận, nên một ô sai vẫn có thể lọt
 * qua cổng E5-S2. Bảng dưới đây chép lại đúng 18 định danh × 4 vai của tài
 * liệu; mọi sai lệch giữa mã và tài liệu đều làm hỏng test, kể cả ô chưa có
 * TC nào đi qua. `undefined` = ô "–" (không có thẩm quyền).
 *
 * Khi SPEC-006 đổi, sửa bảng này TRƯỚC, xem test đỏ, rồi mới sửa matrix.ts.
 */
const SPEC_006: Record<Permission, Record<Role, Scope | true | undefined>> = {
  //                                    BUYER    AFFILIATE  AFFILIATE_MASTER  ADMIN
  "request.create": { BUYER: true, AFFILIATE: true, AFFILIATE_MASTER: true, ADMIN: true },
  "request.view": { BUYER: "own", AFFILIATE: "any", AFFILIATE_MASTER: "any", ADMIN: "any" },
  "request.edit": { BUYER: "own", AFFILIATE: undefined, AFFILIATE_MASTER: undefined, ADMIN: "any" },
  "request.close": { BUYER: "own", AFFILIATE: "own", AFFILIATE_MASTER: "any", ADMIN: "any" },
  "request.buyer_note": {
    BUYER: "own",
    AFFILIATE: undefined,
    AFFILIATE_MASTER: undefined,
    ADMIN: "any",
  },
  "request.order_id.edit_any_status": {
    BUYER: undefined,
    AFFILIATE: undefined,
    AFFILIATE_MASTER: true,
    ADMIN: true,
  },
  "affiliate.queue.view": {
    BUYER: undefined,
    AFFILIATE: true,
    AFFILIATE_MASTER: true,
    ADMIN: true,
  },
  "affiliate.claim.unclaimed": {
    BUYER: undefined,
    AFFILIATE: true,
    AFFILIATE_MASTER: true,
    ADMIN: true,
  },
  "affiliate.claim.override": {
    BUYER: undefined,
    AFFILIATE: undefined,
    AFFILIATE_MASTER: true,
    ADMIN: true,
  },
  "affiliate.unclaim": {
    BUYER: undefined,
    AFFILIATE: "own",
    AFFILIATE_MASTER: "any",
    ADMIN: "any",
  },
  "affiliate.note": { BUYER: undefined, AFFILIATE: "own", AFFILIATE_MASTER: "any", ADMIN: "any" },
  "affiliate.fill": { BUYER: undefined, AFFILIATE: "own", AFFILIATE_MASTER: "any", ADMIN: "any" },
  "affiliate.bulk_close": {
    BUYER: undefined,
    AFFILIATE: "own",
    AFFILIATE_MASTER: "any",
    ADMIN: "any",
  },
  "reconciliation.run": {
    BUYER: undefined,
    AFFILIATE: undefined,
    AFFILIATE_MASTER: true,
    ADMIN: true,
  },
  "reconciliation.export": {
    BUYER: undefined,
    AFFILIATE: undefined,
    AFFILIATE_MASTER: true,
    ADMIN: true,
  },
  "user.manage": {
    BUYER: undefined,
    AFFILIATE: undefined,
    AFFILIATE_MASTER: undefined,
    ADMIN: true,
  },
  "config.manage": {
    BUYER: undefined,
    AFFILIATE: undefined,
    AFFILIATE_MASTER: undefined,
    ADMIN: true,
  },
  "system.bulk_close": {
    BUYER: undefined,
    AFFILIATE: undefined,
    AFFILIATE_MASTER: undefined,
    ADMIN: true,
  },
};

const ROLES: Role[] = ["BUYER", "AFFILIATE", "AFFILIATE_MASTER", "ADMIN"];

describe("SPEC-006 — ma trận thẩm quyền khớp tài liệu", () => {
  for (const role of ROLES) {
    for (const permission of PERMISSIONS) {
      it(`${role} × ${permission}`, () => {
        expect(MATRIX[role][permission]).toBe(SPEC_006[permission][role]);
      });
    }
  }

  it("không có định danh thừa trong ma trận", () => {
    for (const role of ROLES) {
      for (const key of Object.keys(MATRIX[role])) {
        expect(PERMISSIONS).toContain(key);
      }
    }
  });
});
