-- AlterTable
ALTER TABLE "OtherItem" ADD COLUMN     "furnitureAssemblyIncluded" BOOLEAN,
ADD COLUMN     "furnitureCondition" TEXT,
ADD COLUMN     "furnitureDimensions" TEXT,
ADD COLUMN     "furnitureMaterial" TEXT,
ADD COLUMN     "furnitureRoomType" TEXT,
ADD COLUMN     "medicalCondition" TEXT,
ADD COLUMN     "medicalManufacturerCountry" TEXT,
ADD COLUMN     "medicalRequiresPrescription" BOOLEAN,
ADD COLUMN     "medicalUsageHours" INTEGER,
ADD COLUMN     "medicalWarrantyMonths" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredInterestOrder" TEXT[] DEFAULT ARRAY[]::TEXT[];
