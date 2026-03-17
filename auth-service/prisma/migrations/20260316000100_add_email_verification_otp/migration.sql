-- Align accounts.status for OTP registration flow
ALTER TABLE "accounts"
    ALTER COLUMN "status" TYPE VARCHAR(32);

ALTER TABLE "accounts"
    ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION';

-- OTP table for email verification
CREATE TABLE IF NOT EXISTS "email_verification_otps" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "purpose" VARCHAR(32) NOT NULL DEFAULT 'REGISTER',
    CONSTRAINT "email_verification_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_verification_otps_account_id_idx" ON "email_verification_otps"("account_id");
CREATE INDEX IF NOT EXISTS "email_verification_otps_expires_at_idx" ON "email_verification_otps"("expires_at");

ALTER TABLE "email_verification_otps"
    ADD CONSTRAINT "email_verification_otps_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
