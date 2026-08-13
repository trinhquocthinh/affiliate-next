import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { type Permission, type Role } from "@/domain/permissions/matrix";
import { hasPermission } from "@/domain/permissions/resolve";

export type ActorContext = {
  userId: string;
  email: string;
  role: Role;
  displayName: string | null;
};

/**
 * Get current actor context from session.
 * Redirects to /login if not authenticated.
 */
export async function getActorContext(): Promise<ActorContext> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = session.user.role ?? "BUYER";

  return {
    userId: session.user.id,
    email: session.user.email!,
    role,
    displayName: session.user.name ?? null,
  };
}

/**
 * Get actor context for API routes. Returns null if not authenticated (no redirect).
 */
export async function getApiActorContext(): Promise<ActorContext | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const role = session.user.role ?? "BUYER";

  return {
    userId: session.user.id,
    email: session.user.email!,
    role,
    displayName: session.user.name ?? null,
  };
}

/**
 * Cổng thẩm quyền cho điểm cuối, phân giải qua ma trận SPEC-006 và ném
 * `ApiError` 403 để khớp cách bắt lỗi sẵn có của các route.
 *
 * Thay cho `assertAdmin`/`assertAffiliate` cũ: hai hàm đó quyết định theo cờ
 * vai nên nằm ngoài tầm luật ESLint chặn so sánh vai — điểm cuối vẫn cấp quyền
 * mà không đi qua ma trận, đúng thứ tech-spec §4 muốn loại bỏ.
 */
export function assertApiPermission(actor: ActorContext, permission: Permission) {
  if (!hasPermission({ id: actor.userId, role: actor.role }, permission)) {
    throw new ApiError("UNAUTHORIZED", "Access denied", 403);
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
