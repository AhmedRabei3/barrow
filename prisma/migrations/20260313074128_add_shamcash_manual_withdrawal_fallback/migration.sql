-- CreateEnum
CREATE TYPE "ShamCashManualWithdrawalStatus" AS ENUM ('PENDING_ADMIN', 'VERIFYING', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "ShamCashManualWithdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "walletCode" TEXT NOT NULL,
    "qrCode" TEXT,
    "note" TEXT,
    "status" "ShamCashManualWithdrawalStatus" NOT NULL DEFAULT 'PENDING_ADMIN',
    "failureReason" TEXT,
    "transactionId" TEXT,
    "verificationRawText" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "verifiedByAdminId" TEXT,
    "completedByAdminId" TEXT,

    CONSTRAINT "ShamCashManualWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShamCashManualWithdrawal_userId_requestedAt_idx" ON "ShamCashManualWithdrawal"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "ShamCashManualWithdrawal_status_updatedAt_idx" ON "ShamCashManualWithdrawal"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ShamCashManualWithdrawal_verifiedByAdminId_idx" ON "ShamCashManualWithdrawal"("verifiedByAdminId");

-- CreateIndex
CREATE INDEX "ShamCashManualWithdrawal_completedByAdminId_idx" ON "ShamCashManualWithdrawal"("completedByAdminId");

-- AddForeignKey
ALTER TABLE "ShamCashManualWithdrawal" ADD CONSTRAINT "ShamCashManualWithdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShamCashManualWithdrawal" ADD CONSTRAINT "ShamCashManualWithdrawal_verifiedByAdminId_fkey" FOREIGN KEY ("verifiedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShamCashManualWithdrawal" ADD CONSTRAINT "ShamCashManualWithdrawal_completedByAdminId_fkey" FOREIGN KEY ("completedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
