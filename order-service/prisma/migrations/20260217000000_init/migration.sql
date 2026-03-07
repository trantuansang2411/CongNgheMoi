-- CreateTable
CREATE TABLE IF NOT EXISTS "carts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "carts_student_id_key" ON "carts"("student_id");

CREATE TABLE IF NOT EXISTS "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title_snapshot" TEXT NOT NULL,
    "price_snapshot" DECIMAL(12,0) NOT NULL,
    "instructor_id" UUID,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_cart_id_course_id_key" ON "cart_items"("cart_id", "course_id");

CREATE TABLE IF NOT EXISTS "orders" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "total" DECIMAL(12,0) NOT NULL,
    "coupon_code" VARCHAR(32),
    "discount_amount" DECIMAL(12,0),
    "payment_intent_id" UUID,
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "orders_student_id_idx" ON "orders"("student_id");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "instructor_id" UUID,
    "title_snapshot" TEXT NOT NULL,
    "original_price" DECIMAL(12,0) NOT NULL,
    "final_price" DECIMAL(12,0) NOT NULL,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items"("order_id");

-- Foreign Keys
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
