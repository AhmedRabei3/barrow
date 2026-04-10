-- Add image metadata columns used by the current payment settings UI.
ALTER TABLE "AppPaymentSettings"
ADD COLUMN IF NOT EXISTS "url" TEXT,
ADD COLUMN IF NOT EXISTS "publicId" TEXT;

-- Preserve the previously stored QR code URL when upgrading from the old schema.
UPDATE "AppPaymentSettings"
SET "url" = COALESCE("url", "shamCashQrCodeUrl")
WHERE "shamCashQrCodeUrl" IS NOT NULL;