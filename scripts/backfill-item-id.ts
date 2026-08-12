import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { extractProductItemId } from "../src/lib/url-utils";

async function main() {
  console.log("Fetching requests with missing productItemId...");
  
  const requests = await prisma.request.findMany({
    where: { productItemId: null },
    select: { id: true, productUrlRaw: true, platform: true },
  });

  console.log(`Found ${requests.length} requests to process.`);

  let successCount = 0;
  
  for (const req of requests) {
    const itemId = extractProductItemId(req.productUrlRaw, req.platform);
    
    if (itemId) {
      await prisma.request.update({
        where: { id: req.id },
        data: { productItemId: itemId },
      });
      successCount++;
    }
  }

  const percentage = requests.length === 0 ? 100 : Math.round((successCount / requests.length) * 100);
  
  console.log(`\nBackfill complete!`);
  console.log(`Successfully extracted ${successCount}/${requests.length} item IDs (${percentage}%).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
