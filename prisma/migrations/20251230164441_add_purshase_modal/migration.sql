-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('PENDING_ADMIN', 'ADMIN_REJECTED', 'PENDING_OWNER', 'OWNER_DECLINED', 'OWNER_ACCEPTED', 'CONVERTED_TO_TRANSACTION');

-- AlterTable
ALTER TABLE "PlatformFee" ALTER COLUMN "percent" SET DEFAULT 5;

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerNote" TEXT,
    "offeredPrice" DECIMAL(12,2),
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'PENDING_ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseRequest_itemId_itemType_idx" ON "PurchaseRequest"("itemId", "itemType");

-- CreateIndex
CREATE INDEX "PurchaseRequest_buyerId_idx" ON "PurchaseRequest"("buyerId");

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
