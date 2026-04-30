-- CreateTable
CREATE TABLE "ListingSearchIndex" (
    "id" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "ownerId" TEXT NOT NULL,
    "categoryId" TEXT,
    "status" "Availability" NOT NULL DEFAULT 'AVAILABLE',
    "sellOrRent" "TransactionType" NOT NULL,
    "rentType" "RentType",
    "price" DECIMAL(12,2) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "locationCity" TEXT,
    "locationCountry" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,

    CONSTRAINT "ListingSearchIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingSearchIndex_isDeleted_status_itemType_sellOrRent_cre_idx" ON "ListingSearchIndex"("isDeleted", "status", "itemType", "sellOrRent", "createdAt");

-- CreateIndex
CREATE INDEX "ListingSearchIndex_isDeleted_status_categoryId_createdAt_idx" ON "ListingSearchIndex"("isDeleted", "status", "categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingSearchIndex_isDeleted_status_itemType_createdAt_idx" ON "ListingSearchIndex"("isDeleted", "status", "itemType", "createdAt");

-- CreateIndex
CREATE INDEX "ListingSearchIndex_isDeleted_status_price_idx" ON "ListingSearchIndex"("isDeleted", "status", "price");

-- CreateIndex
CREATE INDEX "ListingSearchIndex_locationCity_isDeleted_status_idx" ON "ListingSearchIndex"("locationCity", "isDeleted", "status");

-- CreateIndex
CREATE INDEX "ListingSearchIndex_ownerId_isDeleted_createdAt_idx" ON "ListingSearchIndex"("ownerId", "isDeleted", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListingSearchIndex_id_itemType_key" ON "ListingSearchIndex"("id", "itemType");

-- CreateIndex
CREATE INDEX "ChargingLog_userId_createdAt_idx" ON "ChargingLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChargingLog_type_createdAt_idx" ON "ChargingLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ChargingLog_createdAt_idx" ON "ChargingLog"("createdAt");

-- CreateIndex
CREATE INDEX "ItemImage_itemId_itemType_createdAt_idx" ON "ItemImage"("itemId", "itemType", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_payerId_status_createdAt_idx" ON "Payment"("payerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_method_idx" ON "Payment"("status", "method");

-- CreateIndex
CREATE INDEX "PinnedItem_itemId_createdAt_idx" ON "PinnedItem"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequest_buyerId_status_createdAt_idx" ON "PurchaseRequest"("buyerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequest_itemId_status_idx" ON "PurchaseRequest"("itemId", "status");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_createdAt_idx" ON "PurchaseRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Referral_userId_idx" ON "Referral"("userId");

-- CreateIndex
CREATE INDEX "Referral_newUser_idx" ON "Referral"("newUser");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

-- CreateIndex
CREATE INDEX "Transaction_ownerId_status_createdAt_idx" ON "Transaction"("ownerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_clientId_status_createdAt_idx" ON "Transaction"("clientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_itemId_itemType_idx" ON "Transaction"("itemId", "itemType");

-- CreateIndex
CREATE INDEX "User_isDeleted_isActive_createdAt_idx" ON "User"("isDeleted", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedger_userId_type_createdAt_idx" ON "WalletLedger"("userId", "type", "createdAt");
