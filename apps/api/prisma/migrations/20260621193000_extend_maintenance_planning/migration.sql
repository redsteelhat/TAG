ALTER TABLE "maintenance_entries"
ADD COLUMN IF NOT EXISTS "next_maintenance_km" DECIMAL(12, 1),
ADD COLUMN IF NOT EXISTS "estimated_next_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reminder_enabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "maintenance_entries"
SET "next_maintenance_km" = "odometer_km" + "expected_interval_km"
WHERE "next_maintenance_km" IS NULL
  AND "odometer_km" IS NOT NULL
  AND "expected_interval_km" IS NOT NULL;
