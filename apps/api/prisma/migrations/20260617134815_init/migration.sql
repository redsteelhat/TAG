-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'GASOLINE', 'LPG', 'HYBRID', 'ELECTRIC', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'CARD', 'DIGITAL', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('VARIABLE', 'FIXED', 'SEMI_VARIABLE', 'PLATFORM_PACKAGE', 'FINANCING', 'DEPRECIATION', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('IMMEDIATE', 'DAILY', 'MONTHLY', 'YEARLY', 'PER_KM', 'PER_TRIP', 'PACKAGE_PERIOD');

-- CreateEnum
CREATE TYPE "PackageAllocationMethod" AS ENUM ('PER_DAY', 'PER_TRIP', 'PER_KM');

-- CreateEnum
CREATE TYPE "FixedCostAllocationMethod" AS ENUM ('CALENDAR_DAY', 'ACTIVE_DAY', 'PER_KM');

-- CreateEnum
CREATE TYPE "DepreciationModel" AS ENUM ('MONTHLY', 'PER_KM');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('RECEIPT', 'SCREENSHOT', 'VEHICLE_DOCUMENT', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'XLSX', 'CSV');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MAINTENANCE_REMINDER', 'INSURANCE_REMINDER', 'TAX_REMINDER', 'PACKAGE_ENDING', 'SYSTEM_ANNOUNCEMENT', 'EXPORT_READY');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trial_ends_at" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'tr-TR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "device_name" TEXT,
    "device_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "default_vehicle_id" TEXT,
    "fixed_cost_allocation_method" "FixedCostAllocationMethod" NOT NULL DEFAULT 'CALENDAR_DAY',
    "show_depreciation_in_profit" BOOLEAN NOT NULL DEFAULT true,
    "daily_target_net_profit" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "model_year" INTEGER,
    "fuel_type" "FuelType" NOT NULL,
    "average_consumption_l_per_100km" DECIMAL(8,3) NOT NULL,
    "odometer_km" DECIMAL(12,1),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "depreciation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "depreciation_model" "DepreciationModel",
    "annual_depreciation_amount" DECIMAL(12,2),
    "annual_estimated_km" DECIMAL(12,1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "expense_type" "ExpenseType",
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "start_odometer_km" DECIMAL(12,1),
    "end_odometer_km" DECIMAL(12,1),
    "total_km" DECIMAL(12,1),
    "active_minutes" INTEGER,
    "status" "ShiftStatus" NOT NULL DEFAULT 'ACTIVE',
    "gross_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cash_net_profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "true_net_profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "calculation_version" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "shift_id" TEXT,
    "trip_date" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "gross_income" DECIMAL(12,2) NOT NULL,
    "tip_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cancellation_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_income" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethodType" NOT NULL,
    "pickup_location" TEXT,
    "dropoff_location" TEXT,
    "trip_km" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deadhead_km" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_km" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimated_fuel_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allocated_package_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allocated_fixed_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allocated_maintenance_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allocated_depreciation_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allocated_other_variable_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cash_net_profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "true_net_profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit_calculation_version" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "income_date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethodType" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "income_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "category_id" TEXT,
    "expense_type" "ExpenseType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "allocation_type" "AllocationType" NOT NULL DEFAULT 'IMMEDIATE',
    "allocation_period_start" TIMESTAMP(3),
    "allocation_period_end" TIMESTAMP(3),
    "odometer_km" DECIMAL(12,1),
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "payment_method" "PaymentMethodType",
    "receipt_url" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "expense_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "fuel_type" "FuelType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "liters" DECIMAL(10,3) NOT NULL,
    "price_per_liter" DECIMAL(10,3) NOT NULL,
    "odometer_km" DECIMAL(12,1),
    "station_name" TEXT,
    "city" TEXT,
    "district" TEXT,
    "full_tank" BOOLEAN NOT NULL DEFAULT false,
    "tank_fill_level" TEXT,
    "payment_method" "PaymentMethodType",
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "fuel_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "maintenance_date" TIMESTAMP(3) NOT NULL,
    "odometer_km" DECIMAL(12,1),
    "expected_interval_km" DECIMAL(12,1),
    "cost_per_km" DECIMAL(10,4),
    "service_name" TEXT,
    "allocation_type" "AllocationType" NOT NULL DEFAULT 'PER_KM',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "maintenance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expense_type" "ExpenseType" NOT NULL DEFAULT 'FIXED',
    "amount" DECIMAL(12,2) NOT NULL,
    "period" "AllocationType" NOT NULL,
    "allocation_method" "FixedCostAllocationMethod" NOT NULL DEFAULT 'CALENDAR_DAY',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "next_due_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_packages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "allocation_method" "PackageAllocationMethod" NOT NULL DEFAULT 'PER_DAY',
    "break_even_target" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tag_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "period" "GoalPeriod" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "target_gross_income" DECIMAL(12,2),
    "target_net_profit" DECIMAL(12,2),
    "target_km" DECIMAL(12,1),
    "target_hourly_profit" DECIMAL(12,2),
    "target_km_profit" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "expense_entry_id" TEXT,
    "fuel_entry_id" TEXT,
    "maintenance_entry_id" TEXT,
    "type" "AttachmentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "original_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "period_type" "GoalPeriod" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "gross_income" DECIMAL(12,2) NOT NULL,
    "total_expenses" DECIMAL(12,2) NOT NULL,
    "cash_net_profit" DECIMAL(12,2) NOT NULL,
    "true_net_profit" DECIMAL(12,2) NOT NULL,
    "total_km" DECIMAL(12,2) NOT NULL,
    "active_minutes" INTEGER NOT NULL,
    "calculation_version" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_id" TEXT,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "file_url" TEXT,
    "storage_key" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_subscription_status_idx" ON "users"("subscription_status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_user_id_key" ON "driver_profiles"("user_id");

-- CreateIndex
CREATE INDEX "vehicles_user_id_idx" ON "vehicles"("user_id");

-- CreateIndex
CREATE INDEX "vehicles_user_id_is_active_idx" ON "vehicles"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_user_id_plate_number_key" ON "vehicles"("user_id", "plate_number");

-- CreateIndex
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");

-- CreateIndex
CREATE INDEX "categories_is_system_idx" ON "categories"("is_system");

-- CreateIndex
CREATE INDEX "shifts_user_id_started_at_idx" ON "shifts"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "shifts_vehicle_id_started_at_idx" ON "shifts"("vehicle_id", "started_at");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE INDEX "trips_user_id_trip_date_idx" ON "trips"("user_id", "trip_date");

-- CreateIndex
CREATE INDEX "trips_vehicle_id_trip_date_idx" ON "trips"("vehicle_id", "trip_date");

-- CreateIndex
CREATE INDEX "trips_shift_id_idx" ON "trips"("shift_id");

-- CreateIndex
CREATE INDEX "income_entries_user_id_income_date_idx" ON "income_entries"("user_id", "income_date");

-- CreateIndex
CREATE INDEX "income_entries_vehicle_id_income_date_idx" ON "income_entries"("vehicle_id", "income_date");

-- CreateIndex
CREATE INDEX "expense_entries_user_id_expense_date_idx" ON "expense_entries"("user_id", "expense_date");

-- CreateIndex
CREATE INDEX "expense_entries_vehicle_id_expense_date_idx" ON "expense_entries"("vehicle_id", "expense_date");

-- CreateIndex
CREATE INDEX "expense_entries_expense_type_idx" ON "expense_entries"("expense_type");

-- CreateIndex
CREATE INDEX "expense_entries_allocation_type_idx" ON "expense_entries"("allocation_type");

-- CreateIndex
CREATE INDEX "fuel_entries_user_id_created_at_idx" ON "fuel_entries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "fuel_entries_vehicle_id_created_at_idx" ON "fuel_entries"("vehicle_id", "created_at");

-- CreateIndex
CREATE INDEX "fuel_entries_vehicle_id_odometer_km_idx" ON "fuel_entries"("vehicle_id", "odometer_km");

-- CreateIndex
CREATE INDEX "maintenance_entries_user_id_maintenance_date_idx" ON "maintenance_entries"("user_id", "maintenance_date");

-- CreateIndex
CREATE INDEX "maintenance_entries_vehicle_id_maintenance_date_idx" ON "maintenance_entries"("vehicle_id", "maintenance_date");

-- CreateIndex
CREATE INDEX "recurring_expenses_user_id_is_active_idx" ON "recurring_expenses"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "recurring_expenses_vehicle_id_is_active_idx" ON "recurring_expenses"("vehicle_id", "is_active");

-- CreateIndex
CREATE INDEX "recurring_expenses_next_due_at_idx" ON "recurring_expenses"("next_due_at");

-- CreateIndex
CREATE INDEX "tag_packages_user_id_starts_at_ends_at_idx" ON "tag_packages"("user_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "tag_packages_vehicle_id_starts_at_ends_at_idx" ON "tag_packages"("vehicle_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "tag_packages_is_active_idx" ON "tag_packages"("is_active");

-- CreateIndex
CREATE INDEX "goals_user_id_period_is_active_idx" ON "goals"("user_id", "period", "is_active");

-- CreateIndex
CREATE INDEX "attachments_user_id_created_at_idx" ON "attachments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "attachments_trip_id_idx" ON "attachments"("trip_id");

-- CreateIndex
CREATE INDEX "attachments_expense_entry_id_idx" ON "attachments"("expense_entry_id");

-- CreateIndex
CREATE INDEX "attachments_fuel_entry_id_idx" ON "attachments"("fuel_entry_id");

-- CreateIndex
CREATE INDEX "report_snapshots_user_id_period_start_period_end_idx" ON "report_snapshots"("user_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "export_jobs_user_id_created_at_idx" ON "export_jobs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "export_jobs_status_idx" ON "export_jobs"("status");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_status_scheduled_at_idx" ON "notifications"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "feedback_user_id_created_at_idx" ON "feedback"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_entries" ADD CONSTRAINT "income_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_entries" ADD CONSTRAINT "maintenance_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_entries" ADD CONSTRAINT "maintenance_entries_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_packages" ADD CONSTRAINT "tag_packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_packages" ADD CONSTRAINT "tag_packages_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_expense_entry_id_fkey" FOREIGN KEY ("expense_entry_id") REFERENCES "expense_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_fuel_entry_id_fkey" FOREIGN KEY ("fuel_entry_id") REFERENCES "fuel_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_maintenance_entry_id_fkey" FOREIGN KEY ("maintenance_entry_id") REFERENCES "maintenance_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
