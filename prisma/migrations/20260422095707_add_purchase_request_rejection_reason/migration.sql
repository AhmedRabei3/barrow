-- DropIndex
DROP INDEX "Location_city_trgm_idx";

-- DropIndex
DROP INDEX "NewCar_brand_trgm_idx";

-- DropIndex
DROP INDEX "NewCar_description_trgm_idx";

-- DropIndex
DROP INDEX "NewCar_model_trgm_idx";

-- DropIndex
DROP INDEX "OldCar_brand_trgm_idx";

-- DropIndex
DROP INDEX "OldCar_description_trgm_idx";

-- DropIndex
DROP INDEX "OldCar_model_trgm_idx";

-- DropIndex
DROP INDEX "OtherItem_brand_trgm_idx";

-- DropIndex
DROP INDEX "OtherItem_description_trgm_idx";

-- DropIndex
DROP INDEX "OtherItem_name_trgm_idx";

-- DropIndex
DROP INDEX "Property_description_trgm_idx";

-- DropIndex
DROP INDEX "Property_title_trgm_idx";

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "rejectionReason" TEXT;
