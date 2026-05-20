import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext } from "@/lib/auth-utils";
import { columnPreferencesSchema } from "@/lib/validations";
import { parseColumnPreferences } from "@/lib/affiliate-columns";
import { getAppConfig } from "@/lib/config-cache";
import type { Prisma } from "@/generated/prisma/client";

// GET /api/users/me/preferences — returns the authenticated user's saved
// affiliate-queue column preferences plus the admin-allowed column set so the
// client can render its toggle UI without needing admin auth on /api/config.
export async function GET() {
  const actor = await getApiActorContext();
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 },
    );
  }

  try {
    const [user, config] = await Promise.all([
      prisma.user.findUnique({
        where: { id: actor.userId },
        select: { columnPreferences: true },
      }),
      getAppConfig(),
    ]);

    const raw = user?.columnPreferences ?? null;
    const columns = raw === null ? null : parseColumnPreferences(raw);

    return NextResponse.json({
      ok: true,
      data: {
        columns,
        allowedColumns: config.AFFILIATE_ALLOWED_COLUMNS,
      },
    });
  } catch (error) {
    console.error("Get user preferences error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to load preferences" } },
      { status: 500 },
    );
  }
}

// PATCH /api/users/me/preferences — persists the authenticated user's
// affiliate-queue column preferences. Body: { columns: ColumnPreference[] }.
export async function PATCH(request: Request) {
  const actor = await getApiActorContext();
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as { columns?: unknown };
    const parsed = columnPreferencesSchema.safeParse(body?.columns);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid columns" },
        },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: actor.userId },
      data: { columnPreferences: parsed.data as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ ok: true, data: { columns: parsed.data } });
  } catch (error) {
    console.error("Update user preferences error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to update preferences" } },
      { status: 500 },
    );
  }
}
