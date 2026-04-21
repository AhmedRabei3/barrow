-- CreateIndex
CREATE INDEX "Category_type_isDeleted_idx" ON "Category"("type", "isDeleted");

-- CreateIndex
CREATE INDEX "ItemImage_itemId_createdAt_idx" ON "ItemImage"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "NewCar_isDeleted_status_categoryId_sellOrRent_createdAt_idx" ON "NewCar"("isDeleted", "status", "categoryId", "sellOrRent", "createdAt");

-- CreateIndex
CREATE INDEX "NewCar_ownerId_isDeleted_createdAt_idx" ON "NewCar"("ownerId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "OldCar_isDeleted_status_categoryId_sellOrRent_createdAt_idx" ON "OldCar"("isDeleted", "status", "categoryId", "sellOrRent", "createdAt");

-- CreateIndex
CREATE INDEX "OldCar_ownerId_isDeleted_createdAt_idx" ON "OldCar"("ownerId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "OtherItem_isDeleted_status_categoryId_sellOrRent_createdAt_idx" ON "OtherItem"("isDeleted", "status", "categoryId", "sellOrRent", "createdAt");

-- CreateIndex
CREATE INDEX "OtherItem_ownerId_isDeleted_createdAt_idx" ON "OtherItem"("ownerId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "PinnedItem_createdAt_itemType_itemId_idx" ON "PinnedItem"("createdAt", "itemType", "itemId");

-- CreateIndex
CREATE INDEX "Property_isDeleted_status_categoryId_sellOrRent_createdAt_idx" ON "Property"("isDeleted", "status", "categoryId", "sellOrRent", "createdAt");

-- CreateIndex
CREATE INDEX "Property_ownerId_isDeleted_createdAt_idx" ON "Property"("ownerId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "Review_itemId_itemType_createdAt_idx" ON "Review"("itemId", "itemType", "createdAt");
