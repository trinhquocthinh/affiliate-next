import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/generated/prisma/client";

type AuditEvent = {
  requestId?: string;
  actorId?: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  source?: string;
  remark?: string;
};

export async function logAuditEvent(event: AuditEvent) {
  try {
    await prisma.auditLog.create({
      data: {
        requestId: event.requestId,
        actorId: event.actorId,
        action: event.action,
        oldValue: event.oldValue ? JSON.parse(JSON.stringify(event.oldValue)) : undefined,
        newValue: event.newValue ? JSON.parse(JSON.stringify(event.newValue)) : undefined,
        source: event.source,
        remark: event.remark,
      },
    });
  } catch (error) {
    // Audit logging should never break the main operation
    console.error("Failed to write audit log:", error);
  }
}
