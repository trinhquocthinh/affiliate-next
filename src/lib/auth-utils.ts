import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type ActorContext = {
  userId: string;
  email: string;
  role: "BUYER" | "AFFILIATE" | "ADMIN";
  displayName: string | null;
  isAdmin: boolean;
  isAffiliate: boolean;
  isBuyer: boolean;
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
    isAdmin: role === "ADMIN",
    isAffiliate: role === "AFFILIATE" || role === "ADMIN",
    isBuyer: role === "BUYER" || role === "ADMIN",
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
    isAdmin: role === "ADMIN",
    isAffiliate: role === "AFFILIATE" || role === "ADMIN",
    isBuyer: role === "BUYER" || role === "ADMIN",
  };
}

export function assertAffiliate(actor: ActorContext) {
  if (!actor.isAffiliate) {
    throw new ApiError("UNAUTHORIZED", "Affiliate access required", 403);
  }
}

export function assertAdmin(actor: ActorContext) {
  if (!actor.isAdmin) {
    throw new ApiError("UNAUTHORIZED", "Admin access required", 403);
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
