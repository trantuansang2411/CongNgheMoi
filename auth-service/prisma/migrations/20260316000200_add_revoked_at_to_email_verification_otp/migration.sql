ALTER TABLE "email_verification_otps"
    ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "email_verification_otps_revoked_at_idx"
    ON "email_verification_otps"("revoked_at");
