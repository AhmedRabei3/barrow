-- CreateEnum
CREATE TYPE "PlatformProfitLedgerType" AS ENUM ('SUBSCRIPTION_REVENUE', 'OPERATING_RESERVE', 'PENDING_REFERRAL_LIABILITY', 'READY_BALANCE_BONUS_LIABILITY', 'USER_WITHDRAWAL_LIABILITY_RELEASE', 'FORFEITED_PENDING_EARNINGS_RELEASE', 'MANUAL_REWARD_LIABILITY', 'RANDOM_LOW_REWARD_LIABILITY');

-- CreateTable
CREATE TABLE "PlatformProfitLedger" (
    "id" TEXT NOT NULL,
    "type" "PlatformProfitLedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "userId" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformProfitLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformProfitLedger_type_createdAt_idx" ON "PlatformProfitLedger"("type", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformProfitLedger_userId_createdAt_idx" ON "PlatformProfitLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformProfitLedger_referenceId_idx" ON "PlatformProfitLedger"("referenceId");

-- AddForeignKey
ALTER TABLE "PlatformProfitLedger" ADD CONSTRAINT "PlatformProfitLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
