import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActorContext, assertAdmin } from "@/lib/auth-utils";
import { updateConfigSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import { revalidateAppConfig } from "@/lib/config-cache";

// GET /api/config — get all config values
export async function GET() {
  try {
    const actor = await getApiActorContext();
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    assertAdmin(actor);

    const configs = await prisma.appConfig.findMany();
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

    return NextResponse.json({ ok: true, data: configMap });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
    console.error("Get config error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to get config" } },
      { status: 500 },
    );
  }
}

// PUT /api/config — update a config value
export async function PUT(request: Request) {
  try {
    const actor = await getApiActorContext();
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    assertAdmin(actor);

    const body = await request.json();
    const parsed = updateConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 },
      );
    }

    const { key, value } = parsed.data;

    const existing = await prisma.appConfig.findUnique({ where: { key } });

    await prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    await logAuditEvent({
      actorId: actor.userId,
      action: "UPDATE_CONFIG",
      oldValue: { key, value: existing?.value },
      newValue: { key, value },
      source: "admin",
    });

    // Invalidate the config cache so the next request picks up the new value.
    await revalidateAppConfig();

    return NextResponse.json({ ok: true, data: { key, value } });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
    console.error("Update config error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to update config" } },
      { status: 500 },
    );
  }
}
