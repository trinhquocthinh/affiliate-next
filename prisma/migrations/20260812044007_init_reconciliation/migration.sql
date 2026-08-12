-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('SUB_ID', 'ORDER_ITEM', 'NONE');

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "matchedCount" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRow" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "orderedAt" TIMESTAMP(3) NOT NULL,
    "orderStatus" TEXT NOT NULL,
    "affiliateStatus" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "orderValue" DECIMAL(12,2) NOT NULL,
    "netCommission" DECIMAL(12,2) NOT NULL,
    "subId1" TEXT,
    "matchedRequestId" TEXT,
    "matchMethod" "MatchMethod" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "ReconciliationRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReconciliationRun_importedById_idx" ON "ReconciliationRun"("importedById");

-- CreateIndex
CREATE INDEX "ReconciliationRun_importedAt_idx" ON "ReconciliationRun"("importedAt");

-- CreateIndex
CREATE INDEX "ReconciliationRow_runId_idx" ON "ReconciliationRow"("runId");

-- CreateIndex
CREATE INDEX "ReconciliationRow_orderId_idx" ON "ReconciliationRow"("orderId");

-- CreateIndex
CREATE INDEX "ReconciliationRow_matchedRequestId_idx" ON "ReconciliationRow"("matchedRequestId");

-- CreateIndex
CREATE INDEX "ReconciliationRow_subId1_idx" ON "ReconciliationRow"("subId1");

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRow" ADD CONSTRAINT "ReconciliationRow_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRow" ADD CONSTRAINT "ReconciliationRow_matchedRequestId_fkey" FOREIGN KEY ("matchedRequestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
