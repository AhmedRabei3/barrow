CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Location_city_trgm_idx"
ON "Location"
USING GIN ("city" gin_trgm_ops);

CREATE INDEX "Location_country_lower_idx"
ON "Location" (LOWER("country"));

CREATE INDEX "Property_title_trgm_idx"
ON "Property"
USING GIN ("title" gin_trgm_ops);

CREATE INDEX "Property_description_trgm_idx"
ON "Property"
USING GIN ("description" gin_trgm_ops);

CREATE INDEX "NewCar_brand_trgm_idx"
ON "NewCar"
USING GIN ("brand" gin_trgm_ops);

CREATE INDEX "NewCar_model_trgm_idx"
ON "NewCar"
USING GIN ("model" gin_trgm_ops);

CREATE INDEX "NewCar_description_trgm_idx"
ON "NewCar"
USING GIN ("description" gin_trgm_ops);

CREATE INDEX "OldCar_brand_trgm_idx"
ON "OldCar"
USING GIN ("brand" gin_trgm_ops);

CREATE INDEX "OldCar_model_trgm_idx"
ON "OldCar"
USING GIN ("model" gin_trgm_ops);

CREATE INDEX "OldCar_description_trgm_idx"
ON "OldCar"
USING GIN ("description" gin_trgm_ops);

CREATE INDEX "OtherItem_name_trgm_idx"
ON "OtherItem"
USING GIN ("name" gin_trgm_ops);

CREATE INDEX "OtherItem_brand_trgm_idx"
ON "OtherItem"
USING GIN ("brand" gin_trgm_ops);

CREATE INDEX "OtherItem_description_trgm_idx"
ON "OtherItem"
USING GIN ("description" gin_trgm_ops);