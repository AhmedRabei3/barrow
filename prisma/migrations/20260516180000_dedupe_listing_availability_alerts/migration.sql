-- Add unique signature to listing availability alerts
ALTER TABLE "ListingAvailabilityAlert"
ADD COLUMN "signature" TEXT;

WITH ranked AS (
  SELECT
    id,
    md5(
      concat_ws(
        '|',
        COALESCE("userId", ''),
        COALESCE("itemType"::text, ''),
        COALESCE("categoryId", ''),
        COALESCE("sellOrRent"::text, ''),
        to_char(round(CAST("centerLat" AS numeric), 4), 'FM999999999.0000'),
        to_char(round(CAST("centerLng" AS numeric), 4), 'FM999999999.0000'),
        to_char(round(CAST("radiusKm" AS numeric), 2), 'FM999999999.00')
      )
    ) AS base_signature,
    row_number() OVER (
      PARTITION BY md5(
        concat_ws(
          '|',
          COALESCE("userId", ''),
          COALESCE("itemType"::text, ''),
          COALESCE("categoryId", ''),
          COALESCE("sellOrRent"::text, ''),
          to_char(round(CAST("centerLat" AS numeric), 4), 'FM999999999.0000'),
          to_char(round(CAST("centerLng" AS numeric), 4), 'FM999999999.0000'),
          to_char(round(CAST("radiusKm" AS numeric), 2), 'FM999999999.00')
        )
      )
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "ListingAvailabilityAlert"
)
UPDATE "ListingAvailabilityAlert" a
SET "signature" = CASE
  WHEN r.rn = 1 THEN r.base_signature
  ELSE r.base_signature || '-' || a.id
END
FROM ranked r
WHERE a.id = r.id;

ALTER TABLE "ListingAvailabilityAlert"
ALTER COLUMN "signature" SET NOT NULL;

CREATE UNIQUE INDEX "ListingAvailabilityAlert_signature_key"
ON "ListingAvailabilityAlert" ("signature");
