import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/generated/prisma/client";
import { MATRIX, type Role } from "@/domain/permissions/matrix";

export type AuditSource = "buyer_ui" | "affiliate_ui" | "admin";

/**
 * Nhãn giao diện nguồn cho dấu vết.
 *
 * Đây là *ghi nhãn mô tả*, không phải phân giải thẩm quyền. Nhãn vẫn suy ra từ
 * ma trận chứ không so sánh vai: `user.manage` là quyền chỉ Admin nắm, nên
 * thêm một vai mới sau này sẽ không lặng lẽ đổi nhãn của dấu vết cũ.
 * Nó sống ở đây để điểm cuối không phải tự làm việc này (tech-spec §4).
 */
export function auditSourceFor(
  role: Role,
  nonAdminSurface: "buyer_ui" | "affiliate_ui",
): AuditSource {
  return MATRIX[role]["user.manage"] ? "admin" : nonAdminSurface;
}

/**
 * Riêng luồng đóng yêu cầu: nhãn mô tả *màn hình* thao tác, không phải cấp
 * quyền. Ai vào được hàng đợi affiliate thì thao tác từ màn affiliate; còn lại
 * là màn người mua. Admin đóng hộ vẫn ghi `affiliate_ui`, giữ đúng nhãn cũ.
 */
export function closeAuditSourceFor(role: Role): AuditSource {
  return MATRIX[role]["affiliate.queue.view"] ? "affiliate_ui" : "buyer_ui";
}

/**
 * SPEC-009 kịch bản 1–2: thao tác có vượt quyền sở hữu không.
 *
 * Vượt quyền = động vào yêu cầu mà mình **không** tạo và **không** đang giữ.
 * Dùng để quyết định có phải ghi dấu vết bắt buộc theo BR-051 hay không —
 * người tự làm việc của mình thì không tính là vượt quyền (kịch bản 2).
 *
 * Lưu ý: đây **không** phải kiểm tra thẩm quyền. Được phép làm hay không là
 * việc của `canAccessRequest`; hàm này chỉ trả lời "có cần ghi vết đậm không".
 */
export function isOwnershipOverride(
  actorId: string,
  resource: { createdById?: string | null; affiliateOwnerId?: string | null },
): boolean {
  const isCreator = resource.createdById === actorId;
  const isHolder = resource.affiliateOwnerId === actorId;
  return !isCreator && !isHolder;
}

/**
 * Gộp các cờ BR-051 thành một `remark` chuẩn hoá, bỏ qua cờ tắt.
 * Trả `undefined` khi không có cờ nào, để không ghi chuỗi rỗng vào dấu vết.
 *
 * Dùng nhãn máy đọc được (`ownership_override`, `link_replaced`) thay vì câu
 * tiếng Việt, vì đây là thứ sẽ bị lọc và đếm khi rà dấu vết.
 */
export function auditRemark(
  ...flags: Array<string | false | null | undefined>
): string | undefined {
  const set = flags.filter((flag): flag is string => !!flag);
  return set.length > 0 ? set.join(",") : undefined;
}

/** SPEC-009: bản ghi thiếu trường bắt buộc thì bị từ chối, không ghi nửa vời. */
export class AuditValidationError extends Error {
  constructor(public field: string) {
    super(`Audit record rejected: missing required field "${field}"`);
    this.name = "AuditValidationError";
  }
}

type AuditEvent = {
  requestId?: string;
  /** Bắt buộc — SPEC-009: không có người thao tác thì dấu vết vô nghĩa. */
  actorId?: string;
  /**
   * Ngoại lệ duy nhất của quy tắc trên: thao tác do hệ thống tự chạy (cron
   * đóng hàng loạt), khi thật sự không có ai bấm nút. Phải khai báo tường minh
   * để "quên truyền actorId" không lặng lẽ trở thành "đây là việc của hệ thống".
   */
  systemActor?: boolean;
  targetUserId?: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  source?: string;
  remark?: string;
};

/**
 * Ghi một bản ghi dấu vết. **Chỉ thêm mới** — module này cố ý không có hàm sửa
 * hay xoá (BR-050, TC-076). Muốn đính chính thì ghi thêm một bản ghi mới.
 *
 * Hai loại lỗi được xử lý khác nhau, có chủ ý:
 * - **Thiếu trường bắt buộc** → ném `AuditValidationError`, không ghi gì. Đây là
 *   lỗi lập trình, phải lộ ra ngay chứ không nuốt (SPEC-009 kịch bản 4).
 * - **Lỗi hạ tầng** (mất kết nối DB…) → nuốt và ghi log, vì dấu vết hỏng không
 *   được phép làm hỏng thao tác nghiệp vụ của người dùng.
 */
export async function logAuditEvent(event: AuditEvent) {
  if (!event.actorId && !event.systemActor) throw new AuditValidationError("actorId");
  if (!event.action) throw new AuditValidationError("action");

  try {
    await prisma.auditLog.create({
      data: {
        requestId: event.requestId,
        actorId: event.actorId,
        targetUserId: event.targetUserId,
        action: event.action,
        oldValue: event.oldValue ? JSON.parse(JSON.stringify(event.oldValue)) : undefined,
        newValue: event.newValue ? JSON.parse(JSON.stringify(event.newValue)) : undefined,
        source: event.source,
        remark: event.remark,
      },
    });
  } catch (error) {
    // Audit logging should never break the main operation
    console.error("Failed to write audit log:", error);
  }
}
