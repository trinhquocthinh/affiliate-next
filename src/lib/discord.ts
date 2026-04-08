import crypto from "crypto";
import { PLATFORM_LABELS } from "@/lib/constants";

// ──────────────────────────────────────────────────────────────
// Env helpers
// ──────────────────────────────────────────────────────────────

function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export const getDiscordConfig = () => ({
  botToken: env("DISCORD_BOT_TOKEN"),
  applicationId: env("DISCORD_APPLICATION_ID"),
  publicKey: env("DISCORD_PUBLIC_KEY"),
  channelId: env("DISCORD_CHANNEL_ID"),
});

// ──────────────────────────────────────────────────────────────
// Signature verification (Ed25519) for Discord interactions
// ──────────────────────────────────────────────────────────────

export async function verifyInteraction(
  rawBody: string,
  signature: string,
  timestamp: string,
): Promise<boolean> {
  const { publicKey } = getDiscordConfig();
  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([
        // Ed25519 DER prefix
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(publicKey, "hex"),
      ]),
      format: "der",
      type: "spki",
    });
    return crypto.verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// Discord REST API helpers
// ──────────────────────────────────────────────────────────────

export async function discordApi(
  method: string,
  path: string,
  body?: unknown,
) {
  const { botToken } = getDiscordConfig();
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${method} ${path}: ${res.status} ${text}`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

export function sendChannelMessage(channelId: string, payload: unknown) {
  return discordApi("POST", `/channels/${channelId}/messages`, payload);
}

export function editChannelMessage(
  channelId: string,
  messageId: string,
  payload: unknown,
) {
  return discordApi(
    "PATCH",
    `/channels/${channelId}/messages/${messageId}`,
    payload,
  );
}

// Thread type 11 = public thread
export function createThread(
  channelId: string,
  name: string,
): Promise<{ id: string }> {
  return discordApi("POST", `/channels/${channelId}/threads`, {
    name,
    type: 11,
    auto_archive_duration: 1440, // 24 hours
  });
}

export function archiveThread(threadId: string) {
  return discordApi("PATCH", `/channels/${threadId}`, {
    archived: true,
    locked: true,
  });
}

// ──────────────────────────────────────────────────────────────
// Embed & component builders
// ──────────────────────────────────────────────────────────────

type RequestInfo = {
  id: string;
  platform: string;
  productUrlRaw: string;
  productName: string | null;
  requesterName: string | null;
  createdAt: Date;
};

const PLATFORM_EMOJI: Record<string, string> = {
  SHOPEE: "🛒",
  TIKTOK: "🎵",
  OTHER: "🔗",
};

export function buildRequestEmbed(req: RequestInfo) {
  const platformLabel =
    PLATFORM_LABELS[req.platform] || req.platform;
  const emoji = PLATFORM_EMOJI[req.platform] || "📦";
  const createdVN = req.createdAt.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return {
    title: `${emoji} ${req.id}`,
    color: 0x3498db, // blue
    fields: [
      {
        name: "Platform",
        value: platformLabel,
        inline: true,
      },
      {
        name: "Người gửi",
        value: req.requesterName || "—",
        inline: true,
      },
      {
        name: "Sản phẩm",
        value: req.productName || "—",
        inline: false,
      },
      {
        name: "Link sản phẩm",
        value: req.productUrlRaw,
        inline: false,
      },
      {
        name: "Thời gian tạo",
        value: createdVN,
        inline: true,
      },
    ],
    footer: { text: "Bấm nút bên dưới để fill link" },
  };
}

export function buildFillButton(requestId: string) {
  return {
    type: 1, // Action row
    components: [
      {
        type: 2, // Button
        style: 1, // Primary (blurple)
        label: "Fill Link",
        custom_id: `fill:${requestId}`,
        emoji: { name: "✏️" },
      },
    ],
  };
}

export function buildFilledEmbed(
  req: RequestInfo,
  affiliateLink: string,
  affiliateName: string,
) {
  const platformLabel =
    PLATFORM_LABELS[req.platform] || req.platform;
  const emoji = PLATFORM_EMOJI[req.platform] || "📦";
  const createdVN = req.createdAt.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return {
    title: `${emoji} ${req.id} — ✅ FILLED`,
    color: 0x2ecc71, // green
    fields: [
      {
        name: "Platform",
        value: platformLabel,
        inline: true,
      },
      {
        name: "Người gửi",
        value: req.requesterName || "—",
        inline: true,
      },
      {
        name: "Sản phẩm",
        value: req.productName || "—",
        inline: false,
      },
      {
        name: "Link sản phẩm",
        value: req.productUrlRaw,
        inline: false,
      },
      {
        name: "Affiliate Link",
        value: affiliateLink,
        inline: false,
      },
      {
        name: "Filled bởi",
        value: affiliateName,
        inline: true,
      },
      {
        name: "Thời gian tạo",
        value: createdVN,
        inline: true,
      },
    ],
  };
}

// Modal for filling affiliate link
export function buildFillModal(requestId: string) {
  return {
    title: `Fill Link — ${requestId}`,
    custom_id: `modal_fill:${requestId}`,
    components: [
      {
        type: 1, // Action row
        components: [
          {
            type: 4, // Text input
            custom_id: "affiliate_link",
            label: "Affiliate Link",
            style: 1, // Short
            placeholder: "https://...",
            required: true,
            max_length: 2000,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "note",
            label: "Ghi chú (không bắt buộc)",
            style: 2, // Paragraph
            required: false,
            max_length: 2000,
          },
        ],
      },
    ],
  };
}

// ──────────────────────────────────────────────────────────────
// Interaction response helpers
// ──────────────────────────────────────────────────────────────

export function interactionResponse(type: number, data?: unknown) {
  return Response.json({ type, data });
}

// type 4 = CHANNEL_MESSAGE_WITH_SOURCE
export function ephemeralReply(content: string) {
  return interactionResponse(4, { content, flags: 64 }); // 64 = EPHEMERAL
}

// type 9 = MODAL
export function modalResponse(modal: unknown) {
  return interactionResponse(9, modal);
}

// type 1 = PONG
export function pongResponse() {
  return Response.json({ type: 1 });
}

// ──────────────────────────────────────────────────────────────
// Thread date helpers (GMT+7)
// ──────────────────────────────────────────────────────────────

export function getTodayDateStringVN(): string {
  return new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
