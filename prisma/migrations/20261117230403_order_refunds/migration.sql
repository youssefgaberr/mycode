-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "cjCostUsd" REAL,
    "stripeFeePence" INTEGER,
    "stripeFeeIsEstimate" BOOLEAN NOT NULL DEFAULT true,
    "refundedPence" INTEGER NOT NULL DEFAULT 0,
    "confirmationEmailSentAt" DATETIME,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("attentionReason", "cjCostUsd", "confirmationEmailSentAt", "createdAt", "customerName", "deliveryPence", "discountPence", "email", "estCostPence", "id", "isTest", "number", "paidAt", "phone", "shipCity", "shipCountry", "shipCounty", "shipLine1", "shipLine2", "shipPostcode", "status", "stripeFeeIsEstimate", "stripeFeePence", "stripePaymentIntentId", "stripeSessionId", "subtotalPence", "totalPence", "updatedAt", "vatPence") SELECT "attentionReason", "cjCostUsd", "confirmationEmailSentAt", "createdAt", "customerName", "deliveryPence", "discountPence", "email", "estCostPence", "id", "isTest", "number", "paidAt", "phone", "shipCity", "shipCountry", "shipCounty", "shipLine1", "shipLine2", "shipPostcode", "status", "stripeFeeIsEstimate", "stripeFeePence", "stripePaymentIntentId", "stripeSessionId", "subtotalPence", "totalPence", "updatedAt", "vatPence" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
