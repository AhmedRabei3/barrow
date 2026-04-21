CREATE INDEX IF NOT EXISTS "NewCar_active_category_lookup_idx"
ON "NewCar"("categoryId")
WHERE "isDeleted" = false AND "status" = 'AVAILABLE';

CREATE INDEX IF NOT EXISTS "OldCar_active_category_lookup_idx"
ON "OldCar"("categoryId")
WHERE "isDeleted" = false AND "status" = 'AVAILABLE';

CREATE INDEX IF NOT EXISTS "Property_active_category_lookup_idx"
ON "Property"("categoryId")
WHERE "isDeleted" = false AND "status" = 'AVAILABLE';

CREATE INDEX IF NOT EXISTS "OtherItem_active_category_lookup_idx"
ON "OtherItem"("categoryId")
WHERE "isDeleted" = false AND "status" = 'AVAILABLE';