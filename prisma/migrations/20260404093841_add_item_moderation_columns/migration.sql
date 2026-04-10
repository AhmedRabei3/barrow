/*
  Warnings:

  - You are about to drop the column `shamCashQrCodeUrl` on the `AppPaymentSettings` table. All the data in the column will be lost.
  - You are about to drop the column `shamCashWalletCode` on the `AppPaymentSettings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OwnerProfitWithdrawalStatus" AS ENUM ('COMPLETED');

-- AlterEnum
ALTER TYPE "Availability" ADD VALUE 'PENDING_REVIEW';

-- AlterTable
ALTER TABLE "AppPaymentSettings" DROP COLUMN "shamCashQrCodeUrl",
DROP COLUMN "shamCashWalletCode";

-- CreateTable
CREATE TABLE "OwnerProfitWithdrawal" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "walletCode" TEXT NOT NULL,
    "note" TEXT,
    "status" "OwnerProfitWithdrawalStatus" NOT NULL DEFAULT 'COMPLETED',
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerProfitWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnerProfitWithdrawal_createdAt_idx" ON "OwnerProfitWithdrawal"("createdAt");

-- CreateIndex
CREATE INDEX "OwnerProfitWithdrawal_adminId_idx" ON "OwnerProfitWithdrawal"("adminId");

-- CreateIndex
CREATE INDEX "ActivationCode_code_idx" ON "ActivationCode"("code");
