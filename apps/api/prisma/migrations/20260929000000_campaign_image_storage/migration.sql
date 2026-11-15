CREATE TYPE "CampaignImageJobStatus" AS ENUM ('RUNNING', 'READY', 'FAILED');
CREATE TYPE "CampaignAssetPurpose" AS ENUM ('BASE_IMAGE', 'FINAL_PIECE');

CREATE TABLE "campaign_image_jobs" (
  "generation_id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "token" UUID NOT NULL,
  "expected_version" BIGINT NOT NULL CHECK ("expected_version" >= 0),
  "status" "CampaignImageJobStatus" NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "campaign_image_jobs_generation_fkey"
    FOREIGN KEY ("organization_id", "campaign_id", "generation_id")
    REFERENCES "campaign_generations" ("organization_id", "campaign_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "campaign_image_jobs_status_expires_at_idx" ON "campaign_image_jobs" ("status", "expires_at");
CREATE UNIQUE INDEX "campaign_image_jobs_owner_generation_key" ON "campaign_image_jobs" ("organization_id", "campaign_id", "generation_id");

CREATE TABLE "campaign_assets" (
  "id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "generation_id" UUID NOT NULL,
  "operation_id" UUID NOT NULL,
  "purpose" "CampaignAssetPurpose" NOT NULL,
  "bucket" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "sha256" TEXT NOT NULL CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  "byte_length" INTEGER NOT NULL CHECK ("byte_length" > 0 AND "byte_length" <= 10485760),
  "content_type" TEXT NOT NULL CHECK ("content_type" IN ('image/png', 'image/jpeg', 'image/webp')),
  "width" INTEGER NOT NULL CHECK ("width" > 0),
  "height" INTEGER NOT NULL CHECK ("height" > 0),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_assets_generation_fkey"
    FOREIGN KEY ("organization_id", "campaign_id", "generation_id")
    REFERENCES "campaign_generations" ("organization_id", "campaign_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "campaign_assets_operation_key" ON "campaign_assets" ("organization_id", "campaign_id", "generation_id", "operation_id", "purpose");
CREATE UNIQUE INDEX "campaign_assets_bucket_object_key_key" ON "campaign_assets" ("bucket", "object_key");
CREATE INDEX "campaign_assets_organization_id_id_idx" ON "campaign_assets" ("organization_id", "id");
