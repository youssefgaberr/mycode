-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
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
    "warehouseCountry" TEXT NOT NULL,
    "logisticName" TEXT,
    "deliveryMinDays" INTEGER,
    "deliveryMaxDays" INTEGER,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "cjName" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cjVariantId" TEXT NOT NULL,
    "cjSku" TEXT,
    "name" TEXT NOT NULL,
    "supplierCostUsd" DOUBLE PRECISION NOT NULL,
    "shippingCostUsd" DOUBLE PRECISION NOT NULL,
    "supplierCostPence" INTEGER NOT NULL,
    "shippingCostPence" INTEGER NOT NULL,
    "pricePence" INTEGER NOT NULL,
    "estProfitPence" INTEGER NOT NULL,
    "warehouseCountry" TEXT NOT NULL,
    "logisticName" TEXT,
    "deliveryMinDays" INTEGER,
    "deliveryMaxDays" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVideo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cjVideoId" TEXT,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "attentionReason" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "customerName" TEXT,
    "phone" TEXT,
    "shipLine1" TEXT,
    "shipLine2" TEXT,
    "shipCity" TEXT,
    "shipCounty" TEXT,
    "shipPostcode" TEXT,
    "shipCountry" TEXT,
    "subtotalPence" INTEGER NOT NULL,
    "discountPence" INTEGER NOT NULL,
    "deliveryPence" INTEGER NOT NULL,
    "totalPence" INTEGER NOT NULL,
    "vatPence" INTEGER NOT NULL,
    "estCostPence" INTEGER NOT NULL,
    "cjCostUsd" DOUBLE PRECISION,
    "stripeFeePence" INTEGER,
    "stripeFeeIsEstimate" BOOLEAN NOT NULL DEFAULT true,
    "refundedPence" INTEGER NOT NULL DEFAULT 0,
    "confirmationEmailSentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "cjVariantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePence" INTEGER NOT NULL,
    "unitCostPence" INTEGER NOT NULL,
    "warehouseCountry" TEXT NOT NULL,
    "logisticName" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CjShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "cjOrderNumber" TEXT NOT NULL,
    "fromCountry" TEXT NOT NULL,
    "logisticName" TEXT,
    "isSandbox" BOOLEAN NOT NULL DEFAULT true,
    "cjOrderId" TEXT,
    "cjStatus" TEXT,
    "costUsd" DOUBLE PRECISION,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "carrier" TEXT,
    "error" TEXT,
    "shippedAt" TIMESTAMP(3),
    "shippedEmailSentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CjShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingCandidate" (
    "id" TEXT NOT NULL,
    "cjProductId" TEXT NOT NULL,
    "cjName" TEXT NOT NULL,
    "cjSku" TEXT,
    "cjCategory" TEXT,
    "supplierName" TEXT,
    "source" TEXT NOT NULL,
    "matchedKeyword" TEXT,
    "listedNum" INTEGER NOT NULL DEFAULT 0,
    "supplierCostUsd" DOUBLE PRECISION,
    "shippingCostUsd" DOUBLE PRECISION,
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
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_cjProductId_key" ON "Product"("cjProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_contentKey_key" ON "Product"("contentKey");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_cjVariantId_key" ON "Variant"("cjVariantId");

-- CreateIndex
CREATE INDEX "Variant_productId_idx" ON "Variant"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductVideo_productId_idx" ON "ProductVideo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CjShipment_cjOrderNumber_key" ON "CjShipment"("cjOrderNumber");

-- CreateIndex
CREATE INDEX "CjShipment_orderId_idx" ON "CjShipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingCandidate_cjProductId_key" ON "SourcingCandidate"("cjProductId");

-- CreateIndex
CREATE INDEX "SourcingCandidate_status_idx" ON "SourcingCandidate"("status");

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVideo" ADD CONSTRAINT "ProductVideo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CjShipment" ADD CONSTRAINT "CjShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

