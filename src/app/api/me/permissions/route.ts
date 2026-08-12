import { NextResponse } from "next/server";
import { getApiActorContext } from "@/lib/auth-utils";
import { MATRIX } from "@/domain/permissions/matrix";

export async function GET() {
  try {
    const actor = await getApiActorContext();
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const permissions = MATRIX[actor.role as keyof typeof MATRIX];

    return NextResponse.json({
      ok: true,
      data: {
        permissions,
      },
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to load permissions" } },
      { status: 500 },
    );
  }
}
