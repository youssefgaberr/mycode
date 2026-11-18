-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SourcingCandidate" (
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
    "info" TEXT NOT NULL DEFAULT '{}',
    "productId" TEXT,
    "notes" TEXT,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SourcingCandidate" ("cjCategory", "cjName", "cjProductId", "cjSku", "deliveryMaxDays", "deliveryMinDays", "discoveredAt", "estPricePence", "estProfitPence", "id", "images", "isAddOn", "listedNum", "logisticName", "matchedKeyword", "notes", "productId", "shippingCostUsd", "source", "status", "stock", "supplierCostUsd", "supplierName", "updatedAt", "variantCount", "videos", "warehouseCountry") SELECT "cjCategory", "cjName", "cjProductId", "cjSku", "deliveryMaxDays", "deliveryMinDays", "discoveredAt", "estPricePence", "estProfitPence", "id", "images", "isAddOn", "listedNum", "logisticName", "matchedKeyword", "notes", "productId", "shippingCostUsd", "source", "status", "stock", "supplierCostUsd", "supplierName", "updatedAt", "variantCount", "videos", "warehouseCountry" FROM "SourcingCandidate";
DROP TABLE "SourcingCandidate";
ALTER TABLE "new_SourcingCandidate" RENAME TO "SourcingCandidate";
CREATE UNIQUE INDEX "SourcingCandidate_cjProductId_key" ON "SourcingCandidate"("cjProductId");
CREATE INDEX "SourcingCandidate_status_idx" ON "SourcingCandidate"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
