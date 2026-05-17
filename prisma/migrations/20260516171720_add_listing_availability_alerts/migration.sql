-- CreateTable
CREATE TABLE "ListingAvailabilityAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" "ItemType",
    "categoryId" TEXT,
    "sellOrRent" "TransactionType",
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMatchAt" TIMESTAMP(3),

    CONSTRAINT "ListingAvailabilityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingAvailabilityAlert_userId_isEnabled_idx" ON "ListingAvailabilityAlert"("userId", "isEnabled");

-- CreateIndex
CREATE INDEX "ListingAvailabilityAlert_isEnabled_itemType_sellOrRent_idx" ON "ListingAvailabilityAlert"("isEnabled", "itemType", "sellOrRent");

-- CreateIndex
CREATE INDEX "ListingAvailabilityAlert_categoryId_isEnabled_idx" ON "ListingAvailabilityAlert"("categoryId", "isEnabled");

-- AddForeignKey
ALTER TABLE "ListingAvailabilityAlert" ADD CONSTRAINT "ListingAvailabilityAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAvailabilityAlert" ADD CONSTRAINT "ListingAvailabilityAlert_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
