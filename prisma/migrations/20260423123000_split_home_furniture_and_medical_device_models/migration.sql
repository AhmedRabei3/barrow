-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE IF NOT EXISTS 'HOME_FURNITURE';
ALTER TYPE "ItemType" ADD VALUE IF NOT EXISTS 'MEDICAL_DEVICE';

-- AlterTable
ALTER TABLE "Location"
ADD COLUMN "homeFurnitureId" TEXT,
ADD COLUMN "medicalDeviceId" TEXT;

-- CreateTable
CREATE TABLE "HomeFurniture" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "sellOrRent" "TransactionType" NOT NULL,
    "rentType" "RentType",
    "status" "Availability" NOT NULL DEFAULT 'AVAILABLE',
    "ownerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "furnitureType" TEXT,
    "condition" TEXT,
    "material" TEXT,
    "roomType" TEXT,
    "dimensions" TEXT,
    "color" TEXT,
    "assemblyIncluded" BOOLEAN NOT NULL DEFAULT false,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "moderationAction" TEXT,
    "moderationNote" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "HomeFurniture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "sellOrRent" "TransactionType" NOT NULL,
    "rentType" "RentType",
    "status" "Availability" NOT NULL DEFAULT 'AVAILABLE',
    "ownerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "deviceClass" TEXT,
    "condition" TEXT,
    "manufacturerCountry" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "warrantyMonths" INTEGER,
    "usageHours" INTEGER,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceRecordAvailable" BOOLEAN NOT NULL DEFAULT false,
    "moderationAction" TEXT,
    "moderationNote" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "MedicalDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_homeFurnitureId_key" ON "Location"("homeFurnitureId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_medicalDeviceId_key" ON "Location"("medicalDeviceId");

-- CreateIndex
CREATE INDEX "HomeFurniture_isDeleted_status_categoryId_sellOrRent_createdAt_idx" ON "HomeFurniture"("isDeleted", "status", "categoryId", "sellOrRent", "createdAt");

-- CreateIndex
CREATE INDEX "HomeFurniture_ownerId_isDeleted_createdAt_idx" ON "HomeFurniture"("ownerId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalDevice_isDeleted_status_categoryId_sellOrRent_createdAt_idx" ON "MedicalDevice"("isDeleted", "status", "categoryId", "sellOrRent", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalDevice_ownerId_isDeleted_createdAt_idx" ON "MedicalDevice"("ownerId", "isDeleted", "createdAt");

-- AddForeignKey
ALTER TABLE "HomeFurniture" ADD CONSTRAINT "HomeFurniture_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeFurniture" ADD CONSTRAINT "HomeFurniture_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDevice" ADD CONSTRAINT "MedicalDevice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDevice" ADD CONSTRAINT "MedicalDevice_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_homeFurnitureId_fkey" FOREIGN KEY ("homeFurnitureId") REFERENCES "HomeFurniture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_medicalDeviceId_fkey" FOREIGN KEY ("medicalDeviceId") REFERENCES "MedicalDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
