-- CreateEnum
CREATE TYPE "ShamCashActivationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'ADMIN_REVIEW', 'ACTIVATED');

-- CreateTable
CREATE TABLE "ShamCashActivationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "txNumber" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "ShamCashActivationStatus" NOT NULL DEFAULT 'PENDING',
    "checkedByWorker" BOOLEAN NOT NULL DEFAULT false,
    "isValid" BOOLEAN,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShamCashActivationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShamCashActivationRequest_userId_createdAt_idx" ON "ShamCashActivationRequest"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShamCashActivationRequest_txNumber_amount_key" ON "ShamCashActivationRequest"("txNumber", "amount");

-- AddForeignKey
ALTER TABLE "ShamCashActivationRequest" ADD CONSTRAINT "ShamCashActivationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
