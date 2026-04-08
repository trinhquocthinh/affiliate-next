import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendChannelMessage,
  createThread,
  archiveThread,
  buildRequestEmbed,
  buildFillButton,
  getDiscordConfig,
  getTodayDateStringVN,
} from "@/lib/discord";

// POST /api/discord/notify — batch notify NEW requests to Discord
// Called by external cron (Cron-job.org) every 15 minutes
export async function POST(request: Request) {
  try {
    // Auth via CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Find NEW requests that haven't been notified yet
    const pendingRequests = await prisma.request.findMany({
      where: {
        status: "NEW",
        discordNotifiedAt: null,
      },
      orderBy: { createdAt: "asc" },
      take: 50, // Cap per batch to avoid rate limits
      include: {
        createdBy: { select: { displayName: true } },
      },
    });

    if (pendingRequests.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    // ── Thread management: one thread per day (GMT+7) ──

    const { channelId } = getDiscordConfig();
    const todayStr = getTodayDateStringVN();

    // Get current thread info from AppConfig
    const [threadIdConfig, threadDateConfig] = await Promise.all([
      prisma.appConfig.findUnique({ where: { key: "DISCORD_CURRENT_THREAD_ID" } }),
      prisma.appConfig.findUnique({ where: { key: "DISCORD_CURRENT_THREAD_DATE" } }),
    ]);

    let threadId = threadIdConfig?.value;
    const threadDate = threadDateConfig?.value;

    // If date changed or no thread exists, rotate
    if (!threadId || threadDate !== todayStr) {
      // Archive old thread if exists
      if (threadId) {
        try {
          await archiveThread(threadId);
        } catch (e) {
          console.warn("Failed to archive old thread:", e);
        }
      }

      // Create new thread
      const newThread = await createThread(
        channelId,
        `📋 Requests — ${todayStr}`,
      );
      threadId = newThread.id;

      // Upsert AppConfig
      await Promise.all([
        prisma.appConfig.upsert({
          where: { key: "DISCORD_CURRENT_THREAD_ID" },
          update: { value: threadId },
          create: { key: "DISCORD_CURRENT_THREAD_ID", value: threadId },
        }),
        prisma.appConfig.upsert({
          where: { key: "DISCORD_CURRENT_THREAD_DATE" },
          update: { value: todayStr },
          create: { key: "DISCORD_CURRENT_THREAD_DATE", value: todayStr },
        }),
      ]);
    }

    // ── Send one message per request ──

    let sentCount = 0;
    const affiliateRoleId = process.env.DISCORD_AFFILIATE_ROLE_ID;

    for (const req of pendingRequests) {
      try {
        const embed = buildRequestEmbed({
          id: req.id,
          platform: req.platform,
          productUrlRaw: req.productUrlRaw,
          productName: req.productName,
          requesterName: req.requesterName ?? req.createdBy.displayName,
          createdAt: req.createdAt,
        });

        // Mention affiliate role only on the first message of the batch
        const content =
          sentCount === 0 && affiliateRoleId
            ? `<@&${affiliateRoleId}> có **${pendingRequests.length}** request mới cần fill link:`
            : undefined;

        const message = await sendChannelMessage(threadId, {
          content,
          allowed_mentions: content ? { roles: [affiliateRoleId!] } : undefined,
          embeds: [embed],
          components: [buildFillButton(req.id)],
        });

        await prisma.request.update({
          where: { id: req.id },
          data: {
            discordNotifiedAt: new Date(),
            discordMessageId: message.id,
          },
        });

        sentCount++;
      } catch (e) {
        console.error(`Failed to notify request ${req.id}:`, e);
      }
    }

    return NextResponse.json({ ok: true, count: sentCount });
  } catch (error) {
    console.error("Discord notify error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
