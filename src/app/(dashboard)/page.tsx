import { getActorContext } from "@/lib/auth-utils";
import { hasPermission } from "@/domain/permissions/resolve";
import type { Permission } from "@/domain/permissions/matrix";
import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/lib/config-cache";
import { AppHeader } from "@/components/layout/app-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircleIcon } from "lucide-react";
import { GreetingText } from "@/components/layout/greeting-text";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  BuyerRecentSection,
  type BuyerRecentItem,
} from "@/components/dashboard/buyer-recent-section";
import {
  AffiliateQueueSection,
  type AffiliateQueueItem,
} from "@/components/dashboard/affiliate-queue-section";
import type { Prisma } from "@/generated/prisma/client";

// ─── Trend helper ─────────────────────────────────────────────────────────

function trendWindows(now: Date) {
  const oneDay = 24 * 60 * 60 * 1000;
  return {
    last24h: new Date(now.getTime() - oneDay),
    prev24hStart: new Date(now.getTime() - 2 * oneDay),
    prev24hEnd: new Date(now.getTime() - oneDay),
    last7d: new Date(now.getTime() - 7 * oneDay),
    prev7dStart: new Date(now.getTime() - 14 * oneDay),
    prev7dEnd: new Date(now.getTime() - 7 * oneDay),
  };
}

function computeStaleThreshold(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// ─── Data fetching ────────────────────────────────────────────────────────

async function getBuyerStats(userId: string) {
  const w = trendWindows(new Date());
  const base = { createdById: userId };

  const [
    activeCount,
    readyCount,
    activeDayNow,
    activeDayPrev,
    activeWeekNow,
    activeWeekPrev,
    readyDayNow,
    readyDayPrev,
    readyWeekNow,
    readyWeekPrev,
  ] = await prisma.$transaction([
    prisma.request.count({ where: { ...base, status: "NEW" } }),
    prisma.request.count({ where: { ...base, status: "FILLED" } }),
    prisma.request.count({ where: { ...base, status: "NEW", createdAt: { gte: w.last24h } } }),
    prisma.request.count({
      where: { ...base, status: "NEW", createdAt: { gte: w.prev24hStart, lt: w.prev24hEnd } },
    }),
    prisma.request.count({ where: { ...base, status: "NEW", createdAt: { gte: w.last7d } } }),
    prisma.request.count({
      where: { ...base, status: "NEW", createdAt: { gte: w.prev7dStart, lt: w.prev7dEnd } },
    }),
    prisma.request.count({ where: { ...base, status: "FILLED", filledAt: { gte: w.last24h } } }),
    prisma.request.count({
      where: { ...base, status: "FILLED", filledAt: { gte: w.prev24hStart, lt: w.prev24hEnd } },
    }),
    prisma.request.count({ where: { ...base, status: "FILLED", filledAt: { gte: w.last7d } } }),
    prisma.request.count({
      where: { ...base, status: "FILLED", filledAt: { gte: w.prev7dStart, lt: w.prev7dEnd } },
    }),
  ]);

  return {
    activeCount,
    readyCount,
    activeDeltaDay: activeDayNow - activeDayPrev,
    activeDeltaWeek: activeWeekNow - activeWeekPrev,
    readyDeltaDay: readyDayNow - readyDayPrev,
    readyDeltaWeek: readyWeekNow - readyWeekPrev,
  };
}

async function getAffiliateStats(userId: string, staleThreshold: Date) {
  const w = trendWindows(new Date());

  const [
    queueCount,
    staleCount,
    claimedCount,
    queueDayNow,
    queueDayPrev,
    queueWeekNow,
    queueWeekPrev,
    claimedDayNow,
    claimedDayPrev,
  ] = await prisma.$transaction([
    prisma.request.count({ where: { status: "NEW" } }),
    prisma.request.count({ where: { status: "NEW", createdAt: { lt: staleThreshold } } }),
    prisma.request.count({
      where: { affiliateOwnerId: userId, status: { in: ["NEW", "FILLED"] } },
    }),
    prisma.request.count({ where: { status: "NEW", createdAt: { gte: w.last24h } } }),
    prisma.request.count({
      where: { status: "NEW", createdAt: { gte: w.prev24hStart, lt: w.prev24hEnd } },
    }),
    prisma.request.count({ where: { status: "NEW", createdAt: { gte: w.last7d } } }),
    prisma.request.count({
      where: { status: "NEW", createdAt: { gte: w.prev7dStart, lt: w.prev7dEnd } },
    }),
    prisma.request.count({
      where: { affiliateOwnerId: userId, lastUpdatedAt: { gte: w.last24h } },
    }),
    prisma.request.count({
      where: {
        affiliateOwnerId: userId,
        lastUpdatedAt: { gte: w.prev24hStart, lt: w.prev24hEnd },
      },
    }),
  ]);

  return {
    queueCount,
    staleCount,
    claimedCount,
    queueDeltaDay: queueDayNow - queueDayPrev,
    queueDeltaWeek: queueWeekNow - queueWeekPrev,
    claimedDeltaDay: claimedDayNow - claimedDayPrev,
  };
}

async function getAdminStats() {
  const w = trendWindows(new Date());
  const [
    totalUsers,
    totalRequests,
    pendingCount,
    filledCount,
    requestsDayNow,
    requestsDayPrev,
    requestsWeekNow,
    requestsWeekPrev,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.request.count(),
    prisma.request.count({ where: { status: "NEW" } }),
    prisma.request.count({ where: { status: "FILLED" } }),
    prisma.request.count({ where: { createdAt: { gte: w.last24h } } }),
    prisma.request.count({
      where: { createdAt: { gte: w.prev24hStart, lt: w.prev24hEnd } },
    }),
    prisma.request.count({ where: { createdAt: { gte: w.last7d } } }),
    prisma.request.count({
      where: { createdAt: { gte: w.prev7dStart, lt: w.prev7dEnd } },
    }),
  ]);

  return {
    totalUsers,
    totalRequests,
    pendingCount,
    filledCount,
    requestsDeltaDay: requestsDayNow - requestsDayPrev,
    requestsDeltaWeek: requestsWeekNow - requestsWeekPrev,
  };
}

async function getBuyerRecent(
  userId: string,
  rangeDays: number,
  statFilter: string | null,
  staleThreshold: Date,
): Promise<BuyerRecentItem[]> {
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
  const where: Prisma.RequestWhereInput = {
    createdById: userId,
    createdAt: { gte: since },
  };
  if (statFilter === "active") where.status = "NEW";
  else if (statFilter === "ready") where.status = "FILLED";

  const rows = await prisma.request.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      createdAt: true,
      platform: true,
      productUrlRaw: true,
      productName: true,
      affiliateLink: true,
      status: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    platform: r.platform,
    productUrlRaw: r.productUrlRaw,
    productName: r.productName,
    affiliateLink: r.affiliateLink,
    status: r.status,
    isStale: r.status !== "CLOSED" && r.createdAt < staleThreshold,
  }));
}

async function getAffiliateQueueList(
  userId: string,
  statFilter: string | null,
  staleThreshold: Date,
): Promise<AffiliateQueueItem[]> {
  const where: Prisma.RequestWhereInput = { status: "NEW" };
  if (statFilter === "stale") where.createdAt = { lt: staleThreshold };
  if (statFilter === "mine") {
    where.affiliateOwnerId = userId;
    where.status = { in: ["NEW", "FILLED"] };
  }

  const rows = await prisma.request.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 25,
    select: {
      id: true,
      createdAt: true,
      lastUpdatedAt: true,
      platform: true,
      productUrlRaw: true,
      productName: true,
      status: true,
      affiliateOwner: { select: { email: true } },
      createdBy: { select: { displayName: true, email: true } },
    },
  });

  const now = Date.now();
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    lastUpdatedAt: r.lastUpdatedAt.toISOString(),
    platform: r.platform,
    productUrlRaw: r.productUrlRaw,
    productName: r.productName,
    status: r.status,
    isStale: r.status !== "CLOSED" && r.createdAt < staleThreshold,
    ageHours: Math.floor((now - r.createdAt.getTime()) / 3600000),
    affiliateOwnerEmail: r.affiliateOwner?.email ?? null,
    createdBy: r.createdBy,
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ stat?: string; range?: string }>;
}) {
  const [actor, sp, config] = await Promise.all([getActorContext(), searchParams, getAppConfig()]);

  // Khối nào hiện trên trang chủ là quyết định theo thẩm quyền, không theo vai
  // (SPEC-006). Ẩn khối không thay cho kiểm tra phía máy chủ — mỗi khối bên
  // trong vẫn tự gọi điểm cuối có `assertPermission`.
  const can = (permission: Permission) =>
    hasPermission({ id: actor.userId, role: actor.role }, permission);

  const staleThreshold = computeStaleThreshold(config.STALE_REQUEST_HOURS);

  const stat = sp.stat ?? null;
  const rangeRaw = parseInt(sp.range ?? "7", 10);
  const range = [7, 14, 30].includes(rangeRaw) ? rangeRaw : 7;

  return (
    <>
      <AppHeader title="Home" />
      <div className="mx-auto w-full max-w-400 flex-1 space-y-8 p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/40 bg-primary/10 text-primary">
              {actor.role.charAt(0) + actor.role.slice(1).toLowerCase()}
            </Badge>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              <GreetingText name={actor.displayName || actor.email.split("@")[0]} />
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Here&apos;s what&apos;s happening today.
            </p>
          </div>
          {can("request.buyer_note") && (
            <Link href="/buyer">
              <Button className="shadow-glow hover:shadow-glow-hover flex h-auto items-center gap-2 rounded-[14px] bg-linear-to-br from-primary to-[#00a877] px-7 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5">
                <PlusCircleIcon className="h-5 w-5" />
                Create New Request
              </Button>
            </Link>
          )}
        </div>

        {can("user.manage") && <AdminBlock />}
        {can("affiliate.queue.view") && (
          <AffiliateBlock userId={actor.userId} stat={stat} staleThreshold={staleThreshold} />
        )}
        {can("request.buyer_note") && (
          <BuyerBlock
            userId={actor.userId}
            stat={stat}
            range={range}
            staleThreshold={staleThreshold}
          />
        )}
      </div>
    </>
  );
}

// ─── Admin block ──────────────────────────────────────────────────────────

async function AdminBlock() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Admin Overview</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="user"
          tone="neutral"
          clickable={false}
        />
        <StatCard
          title="Total Requests"
          value={stats.totalRequests}
          icon="file"
          deltaDay={stats.requestsDeltaDay}
          deltaWeek={stats.requestsDeltaWeek}
          tone="info"
          clickable={false}
        />
        <StatCard
          title="Pending"
          value={stats.pendingCount}
          icon="clock"
          tone="warning"
          clickable={false}
        />
        <StatCard
          title="Filled"
          value={stats.filledCount}
          icon="check"
          tone="success"
          clickable={false}
        />
      </div>
    </div>
  );
}

// ─── Buyer block ──────────────────────────────────────────────────────────

async function BuyerBlock({
  userId,
  stat,
  range,
  staleThreshold,
}: {
  userId: string;
  stat: string | null;
  range: number;
  staleThreshold: Date;
}) {
  const buyerStat = stat === "active" || stat === "ready" ? stat : null;
  const [stats, recent] = await Promise.all([
    getBuyerStats(userId),
    getBuyerRecent(userId, range, buyerStat, staleThreshold),
  ]);

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Buyer Overview</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <StatCard
          title="Active Requests"
          value={stats.activeCount}
          icon="clock"
          description="Pending affiliate links"
          deltaDay={stats.activeDeltaDay}
          deltaWeek={stats.activeDeltaWeek}
          statKey="active"
          tone="warning"
        />
        <StatCard
          title="Ready to Collect"
          value={stats.readyCount}
          icon="check"
          description="Links filled by affiliates"
          deltaDay={stats.readyDeltaDay}
          deltaWeek={stats.readyDeltaWeek}
          statKey="ready"
          tone="success"
        />
      </div>
      <BuyerRecentSection items={recent} range={range} activeStat={buyerStat} />
    </div>
  );
}

// ─── Affiliate block ──────────────────────────────────────────────────────

async function AffiliateBlock({
  userId,
  stat,
  staleThreshold,
}: {
  userId: string;
  stat: string | null;
  staleThreshold: Date;
}) {
  const affStat = stat === "queue" || stat === "stale" || stat === "mine" ? stat : null;
  const [stats, queue] = await Promise.all([
    getAffiliateStats(userId, staleThreshold),
    getAffiliateQueueList(userId, affStat ?? "queue", staleThreshold),
  ]);

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Affiliate Overview</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
        <StatCard
          title="Queue"
          value={stats.queueCount}
          icon="inbox"
          description="Requests waiting for links"
          deltaDay={stats.queueDeltaDay}
          deltaWeek={stats.queueDeltaWeek}
          statKey="queue"
          tone="info"
        />
        <StatCard
          title="Stale"
          value={stats.staleCount}
          icon="alert"
          description="Over the stale threshold"
          statKey="stale"
          tone="danger"
        />
        <StatCard
          title="My Claimed"
          value={stats.claimedCount}
          icon="user"
          description="Assigned to you"
          deltaDay={stats.claimedDeltaDay}
          statKey="mine"
          tone="success"
        />
      </div>
      <AffiliateQueueSection items={queue} activeStat={affStat} />
    </div>
  );
}
