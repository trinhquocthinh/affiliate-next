import useSWR from "swr";
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

export function usePermissions() {
  const { data, isLoading } = useSWR<PermissionsResponse>("/api/me/permissions");

  const permissions = data?.ok && data.data ? data.data.permissions : {};

  const hasPermission = (permission: Permission) => {
    return !!permissions[permission];
  };

  const getPermissionScope = (permission: Permission) => {
    return permissions[permission];
  };

  return {
    permissions,
    hasPermission,
    getPermissionScope,
    isLoading,
  };
}
