import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext, assertAdmin } from "@/lib/auth-utils";
import { updateUserSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";

// PATCH /api/users/[id] — update user role/status (admin only)
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

    assertAdmin(actor);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true, displayName: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (parsed.data.displayName !== undefined) updateData.displayName = parsed.data.displayName;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
      },
    });

    await logAuditEvent({
      actorId: actor.userId,
      action: "UPDATE_USER",
      oldValue: { role: existing.role, isActive: existing.isActive, displayName: existing.displayName },
      newValue: { role: updated.role, isActive: updated.isActive, displayName: updated.displayName },
      source: "admin",
      remark: `Updated user ${updated.email}`,
    });

    return NextResponse.json({ ok: true, data: { user: updated } });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
    console.error("Update user error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to update user" } },
      { status: 500 },
    );
  }
}
