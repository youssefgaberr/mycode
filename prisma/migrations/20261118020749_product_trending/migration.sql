-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "cjProductId" TEXT NOT NULL,
    "cjSku" TEXT,
    "contentKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bullets" TEXT NOT NULL,
    "specs" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL,
    "pricePence" INTEGER NOT NULL,
    "supplierCostPence" INTEGER NOT NULL,
    "shippingCostPence" INTEGER NOT NULL,
    "estProfitPence" INTEGER NOT NULL,
    "isAddOn" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "warehouseCountry" TEXT NOT NULL,
    "logisticName" TEXT,
    "deliveryMinDays" INTEGER,
    "deliveryMaxDays" INTEGER,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "cjName" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("bullets", "category", "cjName", "cjProductId", "cjSku", "contentKey", "createdAt", "deliveryMaxDays", "deliveryMinDays", "description", "estProfitPence", "id", "inStock", "isAddOn", "isDemo", "lastSyncedAt", "logisticName", "pricePence", "published", "shippingCostPence", "slug", "specs", "summary", "supplierCostPence", "title", "updatedAt", "warehouseCountry") SELECT "bullets", "category", "cjName", "cjProductId", "cjSku", "contentKey", "createdAt", "deliveryMaxDays", "deliveryMinDays", "description", "estProfitPence", "id", "inStock", "isAddOn", "isDemo", "lastSyncedAt", "logisticName", "pricePence", "published", "shippingCostPence", "slug", "specs", "summary", "supplierCostPence", "title", "updatedAt", "warehouseCountry" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_cjProductId_key" ON "Product"("cjProductId");
CREATE UNIQUE INDEX "Product_contentKey_key" ON "Product"("contentKey");
CREATE INDEX "Product_category_idx" ON "Product"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
