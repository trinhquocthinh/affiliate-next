import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Fetching requests with orderId...");

  const requests = await prisma.request.findMany({
    where: { orderId: { not: null } },
    select: { id: true, orderId: true, platform: true },
  });

  console.log(`Found ${requests.length} requests with an orderId.\n`);

  let validCount = 0;
  let invalidCount = 0;

  for (const req of requests) {
    const orderId = req.orderId!.trim();
    let isValid = false;

    if (req.platform === "SHOPEE") {
      // Shopee: 14 characters, starts with 6 digits (YYMMDD format typically)
      isValid = /^\d{6}[A-Za-z0-9]{8}$/.test(orderId) && orderId.length === 14;
    } else if (req.platform === "TIKTOK") {
      // TikTok: 18 digits
      isValid = /^\d{18}$/.test(orderId);
    } else {
      // OTHER platform has no strict format
      isValid = true;
    }

    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
      console.log(`❌ Invalid Order ID [${req.platform}]: ${orderId} (Request: ${req.id})`);
    }
  }

  const validPercentage =
    requests.length === 0 ? 100 : Math.round((validCount / requests.length) * 100);
  const invalidPercentage =
    requests.length === 0 ? 0 : Math.round((invalidCount / requests.length) * 100);

  console.log(`\nAudit complete!`);
  console.log(`Total: ${requests.length}`);
  console.log(`Valid: ${validCount} (${validPercentage}%)`);
  console.log(`Invalid: ${invalidCount} (${invalidPercentage}%)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
