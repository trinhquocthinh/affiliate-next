import { getActorContext } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/lib/config-cache";
import { AppHeader } from "@/components/layout/app-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PlusCircleIcon,
  InboxIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  UserIcon,
  FilesIcon,
} from "lucide-react";
import { GreetingText } from "@/components/layout/greeting-text";

async function getBuyerStats(userId: string) {
  // Single transaction — 1 DB round-trip instead of 2.
  const [activeCount, readyCount] = await prisma.$transaction([
    prisma.request.count({ where: { createdById: userId, status: "NEW" } }),
    prisma.request.count({ where: { createdById: userId, status: "FILLED" } }),
  ]);
  return { activeCount, readyCount };
}

async function getAffiliateStats(userId: string) {
  const config = await getAppConfig();
  const staleThreshold = new Date(Date.now() - config.STALE_REQUEST_HOURS * 60 * 60 * 1000);

  // Single transaction — 1 DB round-trip instead of 3.
  const [queueCount, staleCount, claimedCount] = await prisma.$transaction([
    prisma.request.count({ where: { status: "NEW" } }),
    prisma.request.count({ where: { status: "NEW", createdAt: { lt: staleThreshold } } }),
    prisma.request.count({
      where: { affiliateOwnerId: userId, status: { in: ["NEW", "FILLED"] } },
    }),
  ]);
  return { queueCount, staleCount, claimedCount };
}

async function getAdminStats() {
  // Single transaction — 1 DB round-trip instead of 4.
  const [totalUsers, totalRequests, pendingCount, filledCount] = await prisma.$transaction([
    prisma.user.count(),
    prisma.request.count(),
    prisma.request.count({ where: { status: "NEW" } }),
    prisma.request.count({ where: { status: "FILLED" } }),
  ]);
  return { totalUsers, totalRequests, pendingCount, filledCount };
}

function GlassStatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <div className="group relative overflow-hidden flex flex-col justify-between min-h-40 bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-white/8 rounded-[20px] p-6 shadow-glass-light dark:shadow-glass-dark transition-all duration-300 hover:-translate-y-1 hover:border-white/20 dark:hover:border-white/15 hover:shadow-xl">
      <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="relative z-10 flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="relative z-10">
        <div className="text-4xl font-bold leading-none mb-2">{value}</div>
        {description && (
          <div className="text-[13px] text-muted-foreground">{description}</div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-white/8 rounded-[20px] p-10 shadow-glass-light dark:shadow-glass-dark">
      <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex justify-center items-center text-3xl mb-4">
        <FilesIcon className="h-7 w-7" />
      </div>
      <h4 className="text-lg font-semibold mb-2">No requests yet</h4>
      <p className="text-muted-foreground text-sm max-w-75">{message}</p>
    </div>
  );
}

export default async function HomePage() {
  const actor = await getActorContext();

  return (
    <>
      <AppHeader title="Home" />
      <div className="flex-1 p-6 md:p-8 w-full max-w-300 mx-auto space-y-8">
        {/* Header Action Area */}
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <div className="inline-block px-3 py-1 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-border rounded-full text-xs font-semibold mb-3 shadow-sm">
              {actor.role.charAt(0) + actor.role.slice(1).toLowerCase()}
            </div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">
              <GreetingText name={actor.displayName || actor.email.split("@")[0]} />
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Here&apos;s what&apos;s happening today.
            </p>
          </div>
          {actor.isBuyer && (
            <Link href="/buyer">
              <Button className="flex items-center gap-2 px-7 py-3.5 h-auto bg-linear-to-br from-primary to-[#00a877] text-white font-semibold text-[15px] rounded-[14px] shadow-glow transition-all duration-200 hover:shadow-glow-hover hover:-translate-y-0.5">
                <PlusCircleIcon className="h-5 w-5" />
                Create New Request
              </Button>
            </Link>
          )}
        </div>

        {actor.isBuyer && <BuyerSection userId={actor.userId} />}
        {actor.isAffiliate && <AffiliateSection userId={actor.userId} />}
        {actor.isAdmin && <AdminSection />}
      </div>
    </>
  );
}

async function BuyerSection({ userId }: { userId: string }) {
  const stats = await getBuyerStats(userId);

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold flex items-center gap-2">Buyer Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassStatCard
          title="Active Requests"
          value={stats.activeCount}
          icon={ClockIcon}
          description="Pending affiliate links"
        />
        <GlassStatCard
          title="Ready to Collect"
          value={stats.readyCount}
          icon={CheckCircleIcon}
          description="Links filled by affiliates"
        />
      </div>

      <h3 className="text-lg font-semibold flex items-center gap-2 pt-2">Recent Requests</h3>
      <EmptyState message="Create a new request to start working with your affiliates." />
    </div>
  );
}

async function AffiliateSection({ userId }: { userId: string }) {
  const stats = await getAffiliateStats(userId);

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold flex items-center gap-2">Affiliate Overview</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <GlassStatCard
          title="Queue"
          value={stats.queueCount}
          icon={InboxIcon}
          description="Requests waiting for links"
        />
        <GlassStatCard
          title="Stale"
          value={stats.staleCount}
          icon={AlertTriangleIcon}
          description="Over 48 hours old"
        />
        <GlassStatCard
          title="My Claimed"
          value={stats.claimedCount}
          icon={UserIcon}
          description="Assigned to you"
        />
      </div>

      <h3 className="text-lg font-semibold flex items-center gap-2 pt-2">Queue</h3>
      <EmptyState message="No requests in the queue right now." />
    </div>
  );
}

async function AdminSection() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold flex items-center gap-2">Admin Overview</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassStatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={UserIcon}
        />
        <GlassStatCard
          title="Total Requests"
          value={stats.totalRequests}
          icon={InboxIcon}
        />
        <GlassStatCard
          title="Pending"
          value={stats.pendingCount}
          icon={ClockIcon}
        />
        <GlassStatCard
          title="Filled"
          value={stats.filledCount}
          icon={CheckCircleIcon}
        />
      </div>
    </div>
  );
}


