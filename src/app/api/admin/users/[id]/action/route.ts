import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext, assertApiPermission } from "@/lib/auth-utils";
import { userActionSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import {
  sendAdminActionNotification,
  type AdminActionKind,
} from "@/lib/discord";
import type { AuditAction, UserStatus } from "@/generated/prisma/client";

export const runtime = "nodejs";

type ActionPlan = {
  nextStatus: UserStatus;
  rejectReason: string | null;
  audit: AuditAction;
};

function planAction(
  action: AdminActionKind,
  currentStatus: UserStatus,
  reason: string | undefined,
): ActionPlan | { error: string } {
  switch (action) {
    case "APPROVE":
      if (currentStatus !== "PENDING") return { error: "INVALID_TRANSITION" };
      return { nextStatus: "ACTIVE", rejectReason: null, audit: "APPROVE_USER" };
    case "REJECT":
      if (currentStatus !== "PENDING") return { error: "INVALID_TRANSITION" };
      return {
        nextStatus: "REJECTED",
        rejectReason: reason ?? null,
        audit: "REJECT_USER",
      };
    case "DELETE":
      if (currentStatus !== "ACTIVE") return { error: "INVALID_TRANSITION" };
      return { nextStatus: "DELETED", rejectReason: null, audit: "DELETE_USER" };
    case "REOPEN":
      if (
        currentStatus !== "REJECTED" &&
        currentStatus !== "DELETED" &&
        currentStatus !== "INACTIVE"
      ) {
        return { error: "INVALID_TRANSITION" };
      }
      return { nextStatus: "ACTIVE", rejectReason: null, audit: "REOPEN_USER" };
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getApiActorContext();
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }
    assertApiPermission(actor, "user.manage");

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = userActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0].message,
          },
        },
        { status: 400 },
      );
    }

    const { action, reason } = parsed.data;

    if (id === actor.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "Cannot perform admin action on your own account",
          },
        },
        { status: 403 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 },
      );
    }

    const plan = planAction(action, existing.status, reason);
    if ("error" in plan) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_TRANSITION",
            message: `Cannot ${action.toLowerCase()} a user with status ${existing.status}`,
          },
        },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        status: plan.nextStatus,
        rejectReason: plan.rejectReason,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        rejectReason: true,
      },
    });

    await logAuditEvent({
      actorId: actor.userId,
      targetUserId: updated.id,
      action: plan.audit,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
      source: "admin",
      remark: action === "REJECT" ? reason : undefined,
    });

    // Fire-and-forget Discord notification — never block the response
    after(() =>
      sendAdminActionNotification({
        admin: {
          id: actor.userId,
          email: actor.email,
          displayName: actor.displayName,
        },
        target: {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
        },
        action,
        reason: action === "REJECT" ? reason ?? null : null,
      }),
    );

    return NextResponse.json({ ok: true, data: { user: updated } });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
    console.error("Admin user action error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Action failed" } },
      { status: 500 },
    );
  }
}
