ALTER TABLE "Checkin" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Checkin" ADD COLUMN "checkoutIdempotencyKey" TEXT;

CREATE UNIQUE INDEX "Checkin_idempotencyKey_key" ON "Checkin"("idempotencyKey");
CREATE UNIQUE INDEX "Checkin_checkoutIdempotencyKey_key" ON "Checkin"("checkoutIdempotencyKey");
