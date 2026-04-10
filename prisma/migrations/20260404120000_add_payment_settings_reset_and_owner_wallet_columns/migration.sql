-- Add missing payment settings columns required by the current admin/payment flows.
ALTER TABLE "AppPaymentSettings"
ADD COLUMN IF NOT EXISTS "paymentResetEmail" TEXT,
ADD COLUMN IF NOT EXISTS "ownerProfitWalletCode" TEXT,
ADD COLUMN IF NOT EXISTS "paymentResetTokenHash" TEXT,
ADD COLUMN IF NOT EXISTS "paymentResetTokenExpires" TIMESTAMP(3);

-- Preserve the legacy ShamCash wallet code when upgrading older databases.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'AppPaymentSettings'
			AND column_name = 'shamCashWalletCode'
	) THEN
		EXECUTE '
			UPDATE "AppPaymentSettings"
			SET "ownerProfitWalletCode" = COALESCE("ownerProfitWalletCode", "shamCashWalletCode")
			WHERE "shamCashWalletCode" IS NOT NULL
		';
	END IF;
END $$;