import { NextResponse } from "next/server";
import { getApiActorContext } from "@/lib/auth-utils";
import { getLinkPreview } from "@/lib/link-preview";

// GET /api/preview?url=... — fetch link preview metadata
export async function GET(request: Request) {
  try {
    const actor = await getApiActorContext();
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "URL parameter is required" } },
        { status: 400 },
      );
    }

    const preview = await getLinkPreview(url);

    return NextResponse.json({
      ok: true,
      data: preview,
    });
  } catch (error) {
    console.error("Link preview error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "PREVIEW_FAILED", message: "Failed to fetch preview" } },
      { status: 500 },
    );
  }
}
