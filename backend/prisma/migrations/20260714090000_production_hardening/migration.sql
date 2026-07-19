-- Reject duplicate assignments/check-ins at the data layer. The preflight blocks
-- deployment with a clear error instead of silently deleting production data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ShiftAssignment"
    GROUP BY "shiftId", "employeeId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate ShiftAssignment rows must be resolved before migration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Checkin"
    GROUP BY "shiftAssignmentId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate Checkin rows must be resolved before migration';
  END IF;
END $$;

CREATE UNIQUE INDEX "ShiftAssignment_shiftId_employeeId_key"
ON "ShiftAssignment"("shiftId", "employeeId");

CREATE UNIQUE INDEX "Checkin_shiftAssignmentId_key"
ON "Checkin"("shiftAssignmentId");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Order"
    WHERE "status" NOT IN ('PAID', 'CANCELLED')
    GROUP BY "tableId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple active orders for one table must be resolved before migration';
  END IF;
END $$;

CREATE UNIQUE INDEX "Order_one_active_per_table_key"
ON "Order"("tableId") WHERE "status" NOT IN ('PAID', 'CANCELLED');

ALTER TABLE "Shift" ADD CONSTRAINT "Shift_valid_time_check" CHECK ("endTime" > "startTime");
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_hourly_rate_check" CHECK ("hourlyRate" IS NULL OR "hourlyRate" >= 0);
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_tax_rate_check" CHECK ("taxRate" >= 0 AND "taxRate" <= 1);
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_price_check" CHECK ("price" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_number_check" CHECK ("number" > 0);
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_capacity_check" CHECK ("capacity" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_amounts_check" CHECK ("subtotal" >= 0 AND "taxAmount" >= 0 AND "totalAmount" >= 0);
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_coordinates_check" CHECK (
  ("latitude" IS NULL AND "longitude" IS NULL) OR
  ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
);
ALTER TABLE "Checkin" ADD CONSTRAINT "Checkin_coordinates_check" CHECK (
  ("latitude" IS NULL AND "longitude" IS NULL) OR
  ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
);

CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

CREATE TYPE "WebhookEventStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'PROCESSING',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StripeWebhookEvent_status_createdAt_idx"
ON "StripeWebhookEvent"("status", "createdAt");
