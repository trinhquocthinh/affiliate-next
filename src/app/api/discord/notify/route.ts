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

      threadId = await createAndSaveThread(channelId, todayStr);
    }

    // ── Send one message per request ──

    let sentCount = 0;
    let failedCount = 0;
    let mentionSent = false;
    const errors: string[] = [];
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

        // Mention affiliate role only on the first successfully sent message
        const content =
          !mentionSent && affiliateRoleId
            ? `<@&${affiliateRoleId}> có **${pendingRequests.length}** request mới cần fill link:`
            : undefined;

        let message;
        try {
          message = await sendChannelMessage(threadId, {
            content,
            allowed_mentions: content ? { roles: [affiliateRoleId!] } : undefined,
            embeds: [embed],
            components: [buildFillButton(req.id)],
          });
        } catch (sendErr) {
          // If thread was deleted/archived externally, create a new one and retry
          if (sendErr instanceof Error && sendErr.message.includes("10003")) {
            console.warn("Thread invalid (Unknown Channel), creating new thread...");
            threadId = await createAndSaveThread(channelId, todayStr);
            message = await sendChannelMessage(threadId, {
              content,
              allowed_mentions: content ? { roles: [affiliateRoleId!] } : undefined,
              embeds: [embed],
              components: [buildFillButton(req.id)],
            });
          } else {
            throw sendErr;
          }
        }

        await prisma.request.update({
          where: { id: req.id },
          data: {
            discordNotifiedAt: new Date(),
            discordMessageId: message.id,
          },
        });

        if (content) mentionSent = true;
        sentCount++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Failed to notify request ${req.id}:`, e);
        errors.push(`${req.id}: ${msg}`);
        failedCount++;
      }
    }

    return NextResponse.json({
      ok: sentCount > 0,
      count: sentCount,
      failed: failedCount,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    console.error("Discord notify error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** Create a new Discord thread and persist its ID in AppConfig */
async function createAndSaveThread(channelId: string, todayStr: string) {
  const newThread = await createThread(
    channelId,
    `📋 Requests — ${todayStr}`,
  );
  await Promise.all([
    prisma.appConfig.upsert({
      where: { key: "DISCORD_CURRENT_THREAD_ID" },
      update: { value: newThread.id },
      create: { key: "DISCORD_CURRENT_THREAD_ID", value: newThread.id },
    }),
    prisma.appConfig.upsert({
      where: { key: "DISCORD_CURRENT_THREAD_DATE" },
      update: { value: todayStr },
      create: { key: "DISCORD_CURRENT_THREAD_DATE", value: todayStr },
    }),
  ]);
  return newThread.id;
}
