import { MATRIX, Permission, Role, Scope } from "./matrix";

export class PermissionError extends Error {
  constructor(public code: "ERR_FORBIDDEN" | "ERR_UNAUTHENTICATED") {
    super(code);
    this.name = "PermissionError";
  }
}

export type Actor = {
  id: string;
  role: Role;
} | null;

export type RequestResource = {
  createdById: string;
  affiliateOwnerId: string | null;
};

export function hasPermission(actor: Actor, permission: Permission): boolean {
  if (!actor) return false;
  const rolePermissions = MATRIX[actor.role];
  return !!rolePermissions[permission];
}

export function getPermissionScope(actor: Actor, permission: Permission): Scope | true | undefined {
  if (!actor) return undefined;
  return MATRIX[actor.role][permission];
}

export function assertPermission(actor: Actor, permission: Permission): void {
  if (!actor) {
    throw new PermissionError("ERR_UNAUTHENTICATED");
  }
  if (!hasPermission(actor, permission)) {
    throw new PermissionError("ERR_FORBIDDEN");
  }
}

export function canAccessRequest(
  actor: Actor,
  request: RequestResource,
  permission: Permission,
): boolean {
  if (!actor) return false;
  const scope = MATRIX[actor.role][permission];

  if (!scope) return false;
  if (scope === true || scope === "any") return true;

  if (permission === "request.close") {
    return request.createdById === actor.id || request.affiliateOwnerId === actor.id;
  }

  if (permission.startsWith("request.")) {
    return request.createdById === actor.id;
  }

  if (permission.startsWith("affiliate.")) {
    return request.affiliateOwnerId === actor.id;
  }

  return false;
}
