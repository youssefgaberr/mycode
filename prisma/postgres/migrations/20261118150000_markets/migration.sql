-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'GBP',
ADD COLUMN     "market" TEXT NOT NULL DEFAULT 'GB';

-- CreateTable
CREATE TABLE "VariantMarket" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "supplierCostMinor" INTEGER NOT NULL,
    "shippingCostMinor" INTEGER NOT NULL,
    "estProfitMinor" INTEGER NOT NULL,
    "isAddOn" BOOLEAN NOT NULL DEFAULT false,
    "shippingCostUsd" DOUBLE PRECISION NOT NULL,
    "warehouseCountry" TEXT NOT NULL,
    "logisticName" TEXT,
    "deliveryMinDays" INTEGER,
    "deliveryMaxDays" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantMarket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VariantMarket_market_idx" ON "VariantMarket"("market");

-- CreateIndex
CREATE UNIQUE INDEX "VariantMarket_variantId_market_key" ON "VariantMarket"("variantId", "market");

-- AddForeignKey
ALTER TABLE "VariantMarket" ADD CONSTRAINT "VariantMarket_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
