import { prisma } from "@/lib/prisma";

/**
 * Generate a request ID in format REQ-YYYYMMDD-NNNN.
 * Uses a database query to find the next sequence number for today.
 */
export async function generateRequestId(): Promise<string> {
  const now = new Date();
  const dateStr = formatDateForId(now);
  const prefix = `REQ-${dateStr}-`;

  // Find the max sequence for today's prefix
  const lastRequest = await prisma.request.findFirst({
    where: {
      id: { startsWith: prefix },
    },
    orderBy: { id: "desc" },
    select: { id: true },
  });

  let sequence = 1;
  if (lastRequest) {
    const lastSeq = parseInt(lastRequest.id.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

function formatDateForId(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
