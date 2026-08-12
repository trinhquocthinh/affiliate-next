import "dotenv/config";
import { PrismaClient, RequestStatus, Platform, CloseReason } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEFAULT_CONFIG: Record<string, string> = {
  PLATFORMS: "SHOPEE,TIKTOK,OTHER",
  STALE_REQUEST_HOURS: "48",
  DUPLICATE_WINDOW_HOURS: "24",
  BULK_CLOSE_MIN_DAYS: "30",
};

async function main() {
  console.log("Seeding database...");

  // Seed default config
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await prisma.appConfig.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log("Default config seeded.");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@affiliate.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await hash(adminPassword, 12);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        displayName: "Admin",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(`Admin user created: ${adminEmail}`);
  }

  const buyerEmail = "buyer@affiliate.local";
  let buyer = await prisma.user.findUnique({ where: { email: buyerEmail } });
  if (!buyer) {
    const passwordHash = await hash("Buyer@123", 12);
    buyer = await prisma.user.create({
      data: {
        email: buyerEmail,
        passwordHash,
        displayName: "Buyer Demo",
        role: "BUYER",
        status: "ACTIVE",
      },
    });
    console.log(`Buyer user created: ${buyerEmail}`);
  }

  const affiliateEmail = "affiliate@affiliate.local";
  let affiliate = await prisma.user.findUnique({ where: { email: affiliateEmail } });
  if (!affiliate) {
    const passwordHash = await hash("Affiliate@123", 12);
    affiliate = await prisma.user.create({
      data: {
        email: affiliateEmail,
        passwordHash,
        displayName: "Affiliate Demo",
        role: "AFFILIATE",
        status: "ACTIVE",
      },
    });
    console.log(`Affiliate user created: ${affiliateEmail}`);
  }

  // Seed inactive affiliate
  const inactiveEmail = "inactive_affiliate@affiliate.local";
  let inactiveAffiliate = await prisma.user.findUnique({ where: { email: inactiveEmail } });
  if (!inactiveAffiliate) {
    const passwordHash = await hash("Inactive@123", 12);
    inactiveAffiliate = await prisma.user.create({
      data: {
        email: inactiveEmail,
        passwordHash,
        displayName: "Inactive Demo",
        role: "AFFILIATE",
        status: "INACTIVE",
      },
    });
    console.log(`Inactive affiliate user created: ${inactiveEmail}`);
  }

  // Seed Requests
  const requestCount = await prisma.request.count();
  if (requestCount === 0) {
    console.log("Seeding requests...");
    const requests = [];

    const generateId = (index: number) => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return `REQ-${today}-${index.toString().padStart(4, "0")}`;
    };

    // 1. NEW requests (unassigned)
    for (let i = 1; i <= 5; i++) {
      requests.push({
        id: generateId(i),
        createdById: buyer.id,
        platform: Platform.SHOPEE,
        productUrlRaw: `https://shopee.vn/product-new-${i}`,
        productUrlNorm: `shopee.vn/product-new-${i}`,
        productName: `New Product ${i}`,
        status: RequestStatus.NEW,
      });
    }

    // 2. NEW requests (claimed)
    for (let i = 6; i <= 8; i++) {
      requests.push({
        id: generateId(i),
        createdById: buyer.id,
        affiliateOwnerId: affiliate.id,
        platform: Platform.TIKTOK,
        productUrlRaw: `https://tiktok.com/product-claimed-${i}`,
        productUrlNorm: `tiktok.com/product-claimed-${i}`,
        productName: `Claimed Product ${i}`,
        status: RequestStatus.NEW,
      });
    }

    // 3. FILLED requests
    for (let i = 9; i <= 14; i++) {
      requests.push({
        id: generateId(i),
        createdById: buyer.id,
        affiliateOwnerId: affiliate.id,
        platform: Platform.SHOPEE,
        productUrlRaw: `https://shopee.vn/product-filled-${i}`,
        productUrlNorm: `shopee.vn/product-filled-${i}`,
        productName: `Filled Product ${i}`,
        affiliateLink: `https://shope.ee/link-${i}`,
        filledAt: new Date(),
        status: RequestStatus.FILLED,
      });
    }

    // 4. CLOSED requests (bought) - Some assigned to inactive affiliate
    for (let i = 15; i <= 18; i++) {
      const ownerId = i % 2 === 0 ? inactiveAffiliate.id : affiliate.id;
      requests.push({
        id: generateId(i),
        createdById: buyer.id,
        affiliateOwnerId: ownerId,
        platform: Platform.SHOPEE,
        productUrlRaw: `https://shopee.vn/product-closed-${i}`,
        productUrlNorm: `shopee.vn/product-closed-${i}`,
        productName: `Bought Product ${i}`,
        affiliateLink: `https://shope.ee/link-${i}`,
        filledAt: new Date(),
        status: RequestStatus.CLOSED,
        closeReason: CloseReason.BOUGHT,
        orderId: `260508ABCDEFGH${i}`,
        closedAt: new Date(),
        closedById: buyer.id,
      });
    }

    // 5. CLOSED requests (invalid/weird order ID)
    for (let i = 19; i <= 20; i++) {
      requests.push({
        id: generateId(i),
        createdById: buyer.id,
        affiliateOwnerId: affiliate.id,
        platform: Platform.SHOPEE,
        productUrlRaw: `https://shopee.vn/product-invalid-order-${i}`,
        productUrlNorm: `shopee.vn/product-invalid-order-${i}`,
        productName: `Invalid Order ID Product ${i}`,
        affiliateLink: `https://shope.ee/link-${i}`,
        filledAt: new Date(),
        status: RequestStatus.CLOSED,
        closeReason: CloseReason.BOUGHT,
        orderId: `INVALID_ORDER_${i}`,
        orderIdWarning: true,
        closedAt: new Date(),
        closedById: buyer.id,
      });
    }

    for (const data of requests) {
      await prisma.request.create({ data });
    }

    console.log(`Created ${requests.length} requests`);
  } else {
    console.log(`Requests already exist (${requestCount}). Skipping request seed.`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
