import { getActorContext } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PlusCircleIcon,
  InboxIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  UserIcon,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

async function getBuyerStats(userId: string) {
  const [activeCount, readyCount] = await Promise.all([
    prisma.request.count({
      where: { createdById: userId, status: "NEW" },
    }),
    prisma.request.count({
      where: { createdById: userId, status: "FILLED" },
    }),
  ]);
  return { activeCount, readyCount };
}

async function getAffiliateStats(userId: string) {
  const staleThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [queueCount, staleCount, claimedCount] = await Promise.all([
    prisma.request.count({ where: { status: "NEW" } }),
    prisma.request.count({
      where: { status: "NEW", createdAt: { lt: staleThreshold } },
    }),
    prisma.request.count({
      where: { affiliateOwnerId: userId, status: { in: ["NEW", "FILLED"] } },
    }),
  ]);
  return { queueCount, staleCount, claimedCount };
}

async function getAdminStats() {
  const [totalUsers, totalRequests, pendingCount, filledCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.request.count(),
      prisma.request.count({ where: { status: "NEW" } }),
      prisma.request.count({ where: { status: "FILLED" } }),
    ]);
  return { totalUsers, totalRequests, pendingCount, filledCount };
}

function StatCard({
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function HomePage() {
  const actor = await getActorContext();
  const greeting = getGreeting();

  return (
    <>
      <AppHeader title="Home" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {greeting}, {actor.displayName || actor.email.split("@")[0]}
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening today.
          </p>
        </div>

        {/* Role badge */}
        <Badge variant="outline" className="capitalize">
          {actor.role.toLowerCase()}
        </Badge>

        {/* Buyer Stats */}
        {actor.isBuyer && <BuyerSection userId={actor.userId} />}

        {/* Affiliate Stats */}
        {actor.isAffiliate && <AffiliateSection userId={actor.userId} />}

        {/* Admin Stats */}
        {actor.isAdmin && <AdminSection />}
      </div>
    </>
  );
}

async function BuyerSection({ userId }: { userId: string }) {
  const stats = await getBuyerStats(userId);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Buyer Overview</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Active Requests"
          value={stats.activeCount}
          icon={ClockIcon}
          description="Pending affiliate links"
        />
        <StatCard
          title="Ready to Collect"
          value={stats.readyCount}
          icon={CheckCircleIcon}
          description="Links filled by affiliates"
        />
        <Card className="flex items-center justify-center border-dashed">
          <CardContent className="pt-6 text-center">
            <Link href="/buyer">
              <Button>
                <PlusCircleIcon className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function AffiliateSection({ userId }: { userId: string }) {
  const stats = await getAffiliateStats(userId);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Affiliate Overview</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Queue"
          value={stats.queueCount}
          icon={InboxIcon}
          description="Requests waiting for links"
        />
        <StatCard
          title="Stale"
          value={stats.staleCount}
          icon={AlertTriangleIcon}
          description="Over 48 hours old"
        />
        <StatCard
          title="My Claimed"
          value={stats.claimedCount}
          icon={UserIcon}
          description="Assigned to you"
        />
        <Card className="flex items-center justify-center border-dashed">
          <CardContent className="pt-6 text-center">
            <Link href="/affiliate">
              <Button>
                <InboxIcon className="mr-2 h-4 w-4" />
                Go to Queue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function AdminSection() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Admin Overview</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={UserIcon}
        />
        <StatCard
          title="Total Requests"
          value={stats.totalRequests}
          icon={InboxIcon}
        />
        <StatCard
          title="Pending"
          value={stats.pendingCount}
          icon={ClockIcon}
        />
        <StatCard
          title="Filled"
          value={stats.filledCount}
          icon={CheckCircleIcon}
        />
      </div>
    </div>
  );
}
