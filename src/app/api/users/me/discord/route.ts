import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";

const DISCORD_ID_REGEX = /^\d{17,20}$/;

// GET /api/users/me/discord — get current user's Discord link status
export async function GET() {
  const actor = await getApiActorContext();
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { discordId: true },
  });

  return NextResponse.json({
    ok: true,
    data: { discordId: user?.discordId || null },
  });
}

// PUT /api/users/me/discord — link/unlink Discord account
export async function PUT(request: Request) {
  const actor = await getApiActorContext();
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 },
    );
  }

  if (!actor.isAffiliate) {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "Affiliate access required" } },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { discordId } = body as { discordId: string | null };

  // Allow null to unlink
  if (discordId === null || discordId === "") {
    await prisma.user.update({
      where: { id: actor.userId },
      data: { discordId: null },
    });
    return NextResponse.json({ ok: true, data: { discordId: null } });
  }

  // Validate format
  if (typeof discordId !== "string" || !DISCORD_ID_REGEX.test(discordId)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Discord User ID phải là chuỗi số 17-20 ký tự",
        },
      },
      { status: 400 },
    );
  }

  // Check uniqueness
  const existing = await prisma.user.findUnique({
    where: { discordId },
    select: { id: true },
  });

  if (existing && existing.id !== actor.userId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CONFLICT",
          message: "Discord ID này đã được liên kết với tài khoản khác",
        },
      },
      { status: 409 },
    );
  }

  await prisma.user.update({
    where: { id: actor.userId },
    data: { discordId },
  });

  return NextResponse.json({ ok: true, data: { discordId } });
}
