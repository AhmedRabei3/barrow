ALTER TABLE "MedicalDevice"
DROP COLUMN IF EXISTS "deviceClass",
DROP COLUMN IF EXISTS "subcategory",
DROP COLUMN IF EXISTS "color",
DROP COLUMN IF EXISTS "manufacturerCountry",
DROP COLUMN IF EXISTS "requiresPrescription",
DROP COLUMN IF EXISTS "maintenanceRecordAvailable";
