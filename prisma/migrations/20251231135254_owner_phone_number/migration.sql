-- DropIndex
DROP INDEX "PurchaseRequest_buyerId_idx";

-- DropIndex
DROP INDEX "PurchaseRequest_itemId_itemType_idx";

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "assignedAdminId" TEXT,
ADD COLUMN     "ownerPhoneNumber" TEXT;

-- CreateIndex
CREATE INDEX "PurchaseRequest_assignedAdminId_idx" ON "PurchaseRequest"("assignedAdminId");

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
