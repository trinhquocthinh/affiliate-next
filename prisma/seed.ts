import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";

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

  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@affiliate.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        displayName: "Admin",
        role: "ADMIN",
      },
    });
    console.log(`Admin user created: ${adminEmail}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // Seed buyer user
  const buyerEmail = "buyer@affiliate.local";
  const existingBuyer = await prisma.user.findUnique({ where: { email: buyerEmail } });
  if (!existingBuyer) {
    const passwordHash = await hash("Buyer@123", 12);
    await prisma.user.create({
      data: {
        email: buyerEmail,
        passwordHash,
        displayName: "Buyer Demo",
        role: "BUYER",
      },
    });
    console.log(`Buyer user created: ${buyerEmail}`);
  } else {
    console.log(`Buyer user already exists: ${buyerEmail}`);
  }

  // Seed affiliate user
  const affiliateEmail = "affiliate@affiliate.local";
  const existingAffiliate = await prisma.user.findUnique({ where: { email: affiliateEmail } });
  if (!existingAffiliate) {
    const passwordHash = await hash("Affiliate@123", 12);
    await prisma.user.create({
      data: {
        email: affiliateEmail,
        passwordHash,
        displayName: "Affiliate Demo",
        role: "AFFILIATE",
      },
    });
    console.log(`Affiliate user created: ${affiliateEmail}`);
  } else {
    console.log(`Affiliate user already exists: ${affiliateEmail}`);
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
