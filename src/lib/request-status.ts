import type { ActorContextValue } from "@/components/layout/actor-provider";
import type { Permission, Scope } from "@/domain/permissions/matrix";

export function statusLabel(status: string): string {
  if (status === "NEW") return "Pending";
  if (status === "FILLED") return "Ready";
  if (status === "CLOSED") return "Closed";
  return status;
}

export type RequestPermissionSubject = {
  status: string;
  closeReason: string | null;
  createdBy: { email: string };
};

export type RequestPermissions = {
  isOwner: boolean;
  canBuyerEdit: boolean;
  canAffiliateAct: boolean;
  canAdminCorrect: boolean;
};

/**
 * Pure role-gate logic for the request detail dialog. Kept free of React so it
 * can be unit tested without mounting components or mocking useActor().
 */
export function computeRequestPermissions(
  data: RequestPermissionSubject | null,
  actor: Pick<ActorContextValue, "email">,
  hasPermission: (perm: Permission) => boolean,
  getPermissionScope: (perm: Permission) => true | Scope | undefined,
): RequestPermissions {
  if (!data) {
    return { isOwner: false, canBuyerEdit: false, canAffiliateAct: false, canAdminCorrect: false };
  }
  const isOwner = data.createdBy.email === actor.email;
  const editScope = getPermissionScope("request.edit");
  const canBuyerEdit = data.status !== "CLOSED" && (editScope === "any" || (editScope === "own" && isOwner));
  const canAffiliateAct = data.status !== "CLOSED" && hasPermission("affiliate.fill");
  const canAdminCorrect =
    hasPermission("request.order_id.edit_any_status") && data.status === "CLOSED" && data.closeReason === "BOUGHT";
  return { isOwner, canBuyerEdit, canAffiliateAct, canAdminCorrect };
}
