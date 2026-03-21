-- CreateTable
CREATE TABLE "AppPaymentSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "subscriptionMonthlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 30,
    "featuredAdMonthlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 10,
    "shamCashWalletCode" TEXT,
    "shamCashQrCodeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppPaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShamCashWebhookEvent" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "paymentId" TEXT,
    "userId" TEXT,
    "payerEmail" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShamCashWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShamCashWebhookEvent_externalId_key" ON "ShamCashWebhookEvent"("externalId");

-- CreateIndex
CREATE INDEX "ShamCashWebhookEvent_userId_idx" ON "ShamCashWebhookEvent"("userId");

-- CreateIndex
CREATE INDEX "ShamCashWebhookEvent_processedAt_idx" ON "ShamCashWebhookEvent"("processedAt");
