-- CreateTable
CREATE TABLE "SourcingCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cjProductId" TEXT NOT NULL,
    "cjName" TEXT NOT NULL,
    "cjSku" TEXT,
    "cjCategory" TEXT,
    "supplierName" TEXT,
    "source" TEXT NOT NULL,
    "matchedKeyword" TEXT,
    "listedNum" INTEGER NOT NULL DEFAULT 0,
    "supplierCostUsd" REAL,
    "shippingCostUsd" REAL,
    "warehouseCountry" TEXT,
    "logisticName" TEXT,
    "deliveryMinDays" INTEGER,
    "deliveryMaxDays" INTEGER,
    "variantCount" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "estPricePence" INTEGER,
    "estProfitPence" INTEGER,
    "isAddOn" BOOLEAN,
    "images" TEXT NOT NULL DEFAULT '[]',
    "videos" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "productId" TEXT,
    "notes" TEXT,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SourcingCandidate_cjProductId_key" ON "SourcingCandidate"("cjProductId");

-- CreateIndex
CREATE INDEX "SourcingCandidate_status_idx" ON "SourcingCandidate"("status");
