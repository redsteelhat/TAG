ALTER TABLE "users"
ADD COLUMN "kvkk_accepted_at" TIMESTAMP(3),
ADD COLUMN "kvkk_version" TEXT,
ADD COLUMN "privacy_notice_accepted_at" TIMESTAMP(3),
ADD COLUMN "privacy_notice_version" TEXT,
ADD COLUMN "explicit_consent_accepted_at" TIMESTAMP(3),
ADD COLUMN "explicit_consent_version" TEXT,
ADD COLUMN "erasure_requested_at" TIMESTAMP(3),
ADD COLUMN "anonymized_at" TIMESTAMP(3);
