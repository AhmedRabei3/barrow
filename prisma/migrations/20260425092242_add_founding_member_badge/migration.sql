-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isFoundingMember" BOOLEAN NOT NULL DEFAULT false;

-- RenameIndex
ALTER INDEX "HomeFurniture_isDeleted_status_categoryId_sellOrRent_createdAt_" RENAME TO "HomeFurniture_isDeleted_status_categoryId_sellOrRent_create_idx";

-- RenameIndex
ALTER INDEX "MedicalDevice_isDeleted_status_categoryId_sellOrRent_createdAt_" RENAME TO "MedicalDevice_isDeleted_status_categoryId_sellOrRent_create_idx";
