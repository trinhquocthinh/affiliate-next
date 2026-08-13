"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { MATRIX, type Permission, type Role, type Scope } from "@/domain/permissions/matrix";

type PermissionMap = Partial<Record<Permission, true | Scope>>;

export type ActorContextValue = {
  role: Role;
  /** Bản đồ quyền đã phân giải, lấy thẳng từ ma trận SPEC-006. */
  permissions: PermissionMap;
  displayName: string | null;
  email: string;
};

const ActorContext = createContext<ActorContextValue>({
  role: "BUYER",
  permissions: MATRIX.BUYER,
  displayName: null,
  email: "",
});

export function ActorProvider({
  children,
  role,
  displayName,
  email,
}: {
  children: ReactNode;
  role: Role;
  displayName: string | null;
  email: string;
}) {
  const value = useMemo<ActorContextValue>(() => {
    const permissions = MATRIX[role];
    return {
      role,
      permissions,
      displayName,
      email,
    };
  }, [role, displayName, email]);

  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}

export function useActor() {
  return useContext(ActorContext);
}
