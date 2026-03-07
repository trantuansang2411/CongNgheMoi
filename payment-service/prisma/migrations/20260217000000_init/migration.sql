-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_intents" (
    "id" UUID NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "student_id" UUID NOT NULL,
    "order_id" UUID,
    "amount" DECIMAL(12,0) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'VND',
    "provider" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "provider_intent_id" TEXT,
    "checkout_url" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_intents_idempotency_key_key" ON "payment_intents"("idempotency_key");
CREATE INDEX IF NOT EXISTS "payment_intents_student_id_idx" ON "payment_intents"("student_id");
CREATE INDEX IF NOT EXISTS "payment_intents_order_id_idx" ON "payment_intents"("order_id");

CREATE TABLE IF NOT EXISTS "payment_transactions" (
    "id" UUID NOT NULL,
    "payment_intent_id" UUID NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "provider_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_transactions_payment_intent_id_idx" ON "payment_transactions"("payment_intent_id");

CREATE TABLE IF NOT EXISTS "webhook_logs" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(16) NOT NULL,
    "event_type" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
