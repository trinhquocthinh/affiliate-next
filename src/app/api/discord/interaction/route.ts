import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  verifyInteraction,
  ephemeralReply,
  modalResponse,
  pongResponse,
  buildFillModal,
  buildFilledEmbed,
  editChannelMessage,
} from "@/lib/discord";

// Disable body parsing — we need the raw text for signature verification
export const dynamic = "force-dynamic";

// POST /api/discord/interaction — Discord interaction endpoint
export async function POST(request: Request) {
  // ── 1. Signature verification ──

  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");

  if (!signature || !timestamp) {
    return new Response("Missing signature headers", { status: 401 });
  }

  const rawBody = await request.text();

  const isValid = await verifyInteraction(rawBody, signature, timestamp);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // ── 2. PING → PONG (Discord endpoint verification) ──

  if (body.type === 1) {
    return pongResponse();
  }

  // ── 3. Button click (type 3 = MESSAGE_COMPONENT) ──

  if (body.type === 3) {
    const customId: string = body.data?.custom_id || "";

    if (customId.startsWith("fill:")) {
      const requestId = customId.slice(5);
      return handleFillButton(body, requestId);
    }

    return ephemeralReply("Hành động không hợp lệ.");
  }

  // ── 4. Modal submit (type 5 = MODAL_SUBMIT) ──

  if (body.type === 5) {
    const customId: string = body.data?.custom_id || "";

    if (customId.startsWith("modal_fill:")) {
      const requestId = customId.slice(11);
      return handleFillModalSubmit(body, requestId);
    }

    return ephemeralReply("Hành động không hợp lệ.");
  }

  return ephemeralReply("Không hỗ trợ loại tương tác này.");
}

// ──────────────────────────────────────────────────────────────
// Button click → show fill modal
// ──────────────────────────────────────────────────────────────

async function handleFillButton(
  interaction: Record<string, unknown>,
  requestId: string,
) {
  const discordUserId = (interaction.member as Record<string, unknown>)?.user
    ? ((interaction.member as Record<string, unknown>).user as Record<string, unknown>).id as string
    : (interaction.user as Record<string, unknown>)?.id as string;

  if (!discordUserId) {
    return ephemeralReply("Không xác định được người dùng Discord.");
  }

  // Look up system user by discordId
  const user = await prisma.user.findUnique({
    where: { discordId: discordUserId },
  });

  if (!user) {
    return ephemeralReply(
      "❌ Bạn chưa liên kết tài khoản Discord.\n" +
        "Vui lòng vào web app → trang Affiliate → mục **Liên kết Discord** để liên kết.",
    );
  }

  if (user.role !== "AFFILIATE" && user.role !== "ADMIN") {
    return ephemeralReply(
      "❌ Chỉ tài khoản Affiliate mới có thể fill link.",
    );
  }

  if (!user.isActive) {
    return ephemeralReply("❌ Tài khoản của bạn đã bị vô hiệu hóa.");
  }

  // Check request status
  const req = await prisma.request.findUnique({ where: { id: requestId } });
  if (!req) {
    return ephemeralReply(`❌ Không tìm thấy request \`${requestId}\`.`);
  }

  if (req.status === "CLOSED") {
    return ephemeralReply(
      `❌ Request \`${requestId}\` đã đóng, không thể fill link.`,
    );
  }

  // Show fill modal
  return modalResponse(buildFillModal(requestId));
}

// ──────────────────────────────────────────────────────────────
// Modal submit → fill affiliate link
// ──────────────────────────────────────────────────────────────

async function handleFillModalSubmit(
  interaction: Record<string, unknown>,
  requestId: string,
) {
  const discordUserId = (interaction.member as Record<string, unknown>)?.user
    ? ((interaction.member as Record<string, unknown>).user as Record<string, unknown>).id as string
    : (interaction.user as Record<string, unknown>)?.id as string;

  if (!discordUserId) {
    return ephemeralReply("Không xác định được người dùng Discord.");
  }

  // Look up system user
  const user = await prisma.user.findUnique({
    where: { discordId: discordUserId },
  });

  if (!user) {
    return ephemeralReply("❌ Tài khoản chưa được liên kết.");
  }

  if (user.role !== "AFFILIATE" && user.role !== "ADMIN") {
    return ephemeralReply("❌ Chỉ tài khoản Affiliate mới có thể fill link.");
  }

  // Extract modal fields
  const components = (
    interaction.data as Record<string, unknown>
  )?.components as Array<{
    components: Array<{ custom_id: string; value: string }>;
  }>;

  let affiliateLink = "";
  let note = "";

  for (const row of components || []) {
    for (const comp of row.components || []) {
      if (comp.custom_id === "affiliate_link") {
        affiliateLink = comp.value?.trim() || "";
      } else if (comp.custom_id === "note") {
        note = comp.value?.trim() || "";
      }
    }
  }

  // Validate URL
  if (!affiliateLink) {
    return ephemeralReply("❌ Vui lòng nhập affiliate link.");
  }

  try {
    const url = new URL(affiliateLink);
    if (!["http:", "https:"].includes(url.protocol)) {
      return ephemeralReply("❌ Link phải bắt đầu bằng http:// hoặc https://");
    }
  } catch {
    return ephemeralReply("❌ Link không hợp lệ. Vui lòng nhập URL đầy đủ.");
  }

  // Fetch and update request
  const existing = await prisma.request.findUnique({ where: { id: requestId } });
  if (!existing) {
    return ephemeralReply(`❌ Không tìm thấy request \`${requestId}\`.`);
  }

  if (existing.status === "CLOSED") {
    return ephemeralReply(
      `❌ Request \`${requestId}\` đã đóng, không thể fill link.`,
    );
  }

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      affiliateLink,
      status: "FILLED",
      affiliateOwnerId: existing.affiliateOwnerId || user.id,
      notes: note || existing.notes,
      lastUpdatedById: user.id,
    },
    include: {
      createdBy: { select: { displayName: true } },
    },
  });

  // Audit log
  await logAuditEvent({
    requestId,
    actorId: user.id,
    action: "FILL_AFFILIATE_LINK",
    oldValue: {
      status: existing.status,
      affiliateLink: existing.affiliateLink,
    },
    newValue: {
      status: "FILLED",
      affiliateLink,
      note: note || undefined,
    },
    source: "discord",
  });

  // Edit original Discord message to show FILLED status
  if (existing.discordMessageId) {
    try {
      // Find the thread ID from AppConfig
      const threadConfig = await prisma.appConfig.findUnique({
        where: { key: "DISCORD_CURRENT_THREAD_ID" },
      });

      const channelId = threadConfig?.value;
      if (channelId) {
        const filledEmbed = buildFilledEmbed(
          {
            id: updated.id,
            platform: updated.platform,
            productUrlRaw: updated.productUrlRaw,
            productName: updated.productName,
            requesterName:
              updated.requesterName ?? updated.createdBy.displayName,
            createdAt: updated.createdAt,
          },
          affiliateLink,
          user.displayName || user.email,
        );

        await editChannelMessage(channelId, existing.discordMessageId, {
          embeds: [filledEmbed],
          components: [], // Remove the Fill button
        });
      }
    } catch (e) {
      console.error("Failed to edit Discord message:", e);
      // Non-critical — fill was still successful
    }
  }

  return ephemeralReply(
    `✅ Đã fill link cho **${requestId}**!\nLink: ${affiliateLink}`,
  );
}
