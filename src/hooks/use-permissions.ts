"use client";

import useSWR from "swr";
import { useActor } from "@/components/layout/actor-provider";
import { Permission, Scope } from "@/domain/permissions/matrix";

type PermissionsResponse = {
  ok: boolean;
  data?: {
    permissions: Partial<Record<Permission, true | Scope>>;
  };
  error?: {
    code: string;
    message: string;
  };
};

/**
 * E5-S4-T2 — đọc thẩm quyền đã phân giải ở phía trình duyệt.
 *
 * Hook này **không định nghĩa lại ma trận**: nguồn vẫn là `/api/me/permissions`,
 * vốn trả thẳng một dòng của `matrix.ts` (SPEC-006). Muốn đổi ai làm được gì,
 * sửa ma trận — không sửa ở đây.
 *
 * Giá trị khởi tạo lấy từ `ActorProvider` (dựng phía máy chủ) nên lần render
 * đầu đã có quyền đúng: nếu chờ SWR, các mục menu sẽ nhấp nháy hiện ra sau.
 * SWR vẫn hỏi lại điểm cuối để bắt kịp khi vai đổi giữa phiên.
 *
 * Ẩn nút **không thay thế** kiểm tra phía máy chủ (BR-035): mọi điểm cuối vẫn
 * tự gọi `assertPermission`, nên gọi thẳng API vẫn bị chặn 403.
 */
export function usePermissions() {
  const { permissions: seeded } = useActor();
  const { data, isLoading } = useSWR<PermissionsResponse>("/api/me/permissions");

  const permissions = data?.ok && data.data ? data.data.permissions : seeded;

  const hasPermission = (permission: Permission) => {
    return !!permissions[permission];
  };

  const getPermissionScope = (permission: Permission) => {
    return permissions[permission];
  };

  /** Làm được trên tài nguyên của người khác không — tức phạm vi `any`. */
  const hasAnyScope = (permission: Permission) => {
    return permissions[permission] === "any";
  };

  return {
    permissions,
    hasPermission,
    getPermissionScope,
    hasAnyScope,
    isLoading,
  };
}
