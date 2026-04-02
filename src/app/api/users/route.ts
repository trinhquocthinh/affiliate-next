import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { getApiActorContext, assertAdmin } from "@/lib/auth-utils";
import { updateUserSchema } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";

// GET /api/users — list all users (admin only)
export async function GET(request: Request) {
  try {
    const actor = await getApiActorContext();
    if (!actor) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    assertAdmin(actor);

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");
    const activeFilter = searchParams.get("active");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (roleFilter) where.role = roleFilter;
    if (activeFilter !== null && activeFilter !== undefined) {
      where.isActive = activeFilter === "true";
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: { users } });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
    console.error("List users error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to list users" } },
      { status: 500 },
    );
  }
}

// POST /api/users — create user (admin only)
export async function POST(request: Request) {
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
    const { email, displayName, role, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Email and password are required" } },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: { code: "CONFLICT", message: "Email already registered" } },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName: displayName || null,
        role: role || "BUYER",
      },
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
      newValue: { userId: user.id, email: user.email, role: user.role },
      source: "admin",
      remark: "Created user",
    });

    return NextResponse.json({ ok: true, data: { user } });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
    console.error("Create user error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "REQUEST_FAILED", message: "Failed to create user" } },
      { status: 500 },
    );
  }
}
