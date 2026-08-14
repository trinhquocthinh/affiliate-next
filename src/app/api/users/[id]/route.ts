import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import { requireApiAuth, parseBody } from "@/lib/api-utils";

// PATCH /api/users/[id] — update user role/status (admin only)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApiAuth("user.manage");
    if (auth.error) return auth.error;
    const actor = auth.actor;

    const { id } = await params;
    const bodyResult = await parseBody(request, updateUserSchema);
    if ("error" in bodyResult) return bodyResult.error;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, displayName: true, discordId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (bodyResult.data.role !== undefined) updateData.role = bodyResult.data.role;
    if (bodyResult.data.status !== undefined) updateData.status = bodyResult.data.status;
    if (bodyResult.data.displayName !== undefined)
      updateData.displayName = bodyResult.data.displayName;
    if (bodyResult.data.discordId !== undefined) updateData.discordId = bodyResult.data.discordId;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        discordId: true,
      },
    });

    await logAuditEvent({
      actorId: actor.userId,
      action: "UPDATE_USER",
      oldValue: {
        role: existing.role,
        status: existing.status,
        displayName: existing.displayName,
        discordId: existing.discordId,
      },
      newValue: {
        role: updated.role,
        status: updated.status,
        displayName: updated.displayName,
        discordId: updated.discordId,
      },
      source: "admin",
      remark: `Updated user ${updated.email}`,
    });

    return NextResponse.json({ ok: true, data: { user: updated } });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to update user" } },
      { status: 500 },
    );
  }
}
