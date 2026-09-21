BEGIN;

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'GENERATING', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignFailureOrigin" AS ENUM ('GENERATION', 'PUBLICATION');

-- CreateEnum
CREATE TYPE "GenerationFailureCode" AS ENUM ('GENERATION_FAILED', 'TIMEOUT', 'INVALID_OUTPUT');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_revision_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "promotion" JSONB,
    "status" "CampaignStatus" NOT NULL,
    "current_generation_id" UUID,
    "candidate_content_id" UUID,
    "approved_content_id" UUID,
    "approved_social_account_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "publication_progress" JSONB,
    "failure_origin" "CampaignFailureOrigin",
    "generation_failure" "GenerationFailureCode",
    "version" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_generations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "number" BIGINT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campaign_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_contents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "generation_id" UUID NOT NULL,
    "headline" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "hashtags" TEXT[] NOT NULL,
    "asset_ids" UUID[] NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "generated_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_generation_failures" (
    "generation_id" UUID NOT NULL,
    "code" "GenerationFailureCode" NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campaign_generation_failures_pkey" PRIMARY KEY ("generation_id")
);

-- CreateIndex
CREATE INDEX "campaigns_organization_id_status_created_at_idx" ON "campaigns"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "campaigns_status_created_at_idx" ON "campaigns"("status", "created_at");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_created_at_idx" ON "campaigns"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_organization_id_id_key" ON "campaigns"("organization_id", "id");

-- CreateIndex
CREATE INDEX "campaign_generations_organization_id_campaign_id_requested__idx" ON "campaign_generations"("organization_id", "campaign_id", "requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_generations_organization_id_campaign_id_id_key" ON "campaign_generations"("organization_id", "campaign_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_generations_organization_id_campaign_id_number_key" ON "campaign_generations"("organization_id", "campaign_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "generated_contents_generation_id_key" ON "generated_contents"("generation_id");

-- CreateIndex
CREATE INDEX "generated_contents_organization_id_campaign_id_created_at_idx" ON "generated_contents"("organization_id", "campaign_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "generated_contents_owner_generation_id_key" ON "generated_contents"("organization_id", "campaign_id", "generation_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "generated_contents_owner_generation_key" ON "generated_contents"("organization_id", "campaign_id", "generation_id");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_template_id_template_revision_id_fkey" FOREIGN KEY ("organization_id", "template_id", "template_revision_id") REFERENCES "template_revisions"("organization_id", "template_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_current_generation_fkey" FOREIGN KEY ("organization_id", "id", "current_generation_id") REFERENCES "campaign_generations"("organization_id", "campaign_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_candidate_content_fkey" FOREIGN KEY ("organization_id", "id", "current_generation_id", "candidate_content_id") REFERENCES "generated_contents"("organization_id", "campaign_id", "generation_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey
ALTER TABLE "campaign_generations" ADD CONSTRAINT "campaign_generations_organization_id_campaign_id_fkey" FOREIGN KEY ("organization_id", "campaign_id") REFERENCES "campaigns"("organization_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "generated_contents" ADD CONSTRAINT "generated_contents_organization_id_campaign_id_generation__fkey" FOREIGN KEY ("organization_id", "campaign_id", "generation_id") REFERENCES "campaign_generations"("organization_id", "campaign_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "campaign_generation_failures" ADD CONSTRAINT "campaign_generation_failures_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "campaign_generations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Scalar constraints supplement the domain's full state validation.
ALTER TABLE "campaigns"
  ADD CONSTRAINT "campaigns_text_check" CHECK (length(btrim("title")) > 0 AND length(btrim("cta")) > 0),
  ADD CONSTRAINT "campaigns_version_check" CHECK ("version" BETWEEN 0 AND 9007199254740991),
  ADD CONSTRAINT "campaigns_dates_check" CHECK ("updated_at" >= "created_at"),
  ADD CONSTRAINT "campaigns_generation_check" CHECK (
    ("status" = 'DRAFT' AND "current_generation_id" IS NULL AND "version" = 0) OR
    ("status" <> 'DRAFT' AND "current_generation_id" IS NOT NULL AND "version" > 0)),
  ADD CONSTRAINT "campaigns_candidate_check" CHECK ("candidate_content_id" IS NULL OR "current_generation_id" IS NOT NULL),
  ADD CONSTRAINT "campaigns_approval_check" CHECK ("approved_content_id" IS NULL OR
    ("candidate_content_id" IS NOT NULL AND "approved_content_id" = "candidate_content_id")),
  ADD CONSTRAINT "campaigns_accounts_check" CHECK (array_position("approved_social_account_ids", NULL) IS NULL),
  ADD CONSTRAINT "campaigns_promotion_check" CHECK ("promotion" IS NULL OR jsonb_typeof("promotion") = 'object'),
  ADD CONSTRAINT "campaigns_progress_check" CHECK ("publication_progress" IS NULL OR
    ("approved_content_id" IS NOT NULL AND jsonb_typeof("publication_progress") = 'array')),
  ADD CONSTRAINT "campaigns_failure_check" CHECK ((
    ("failure_origin" IS NULL AND "generation_failure" IS NULL AND "status" NOT IN ('FAILED', 'PARTIALLY_PUBLISHED')) OR
    ("failure_origin" = 'GENERATION' AND "generation_failure" IS NOT NULL AND "status" = 'FAILED') OR
    ("failure_origin" = 'PUBLICATION' AND "generation_failure" IS NULL AND "status" IN ('FAILED', 'PARTIALLY_PUBLISHED'))) IS TRUE),
  ADD CONSTRAINT "campaigns_state_check" CHECK ((CASE
    WHEN "status" IN ('DRAFT', 'GENERATING') OR ("status" = 'FAILED' AND "failure_origin" = 'GENERATION')
      THEN "candidate_content_id" IS NULL AND "approved_content_id" IS NULL AND "publication_progress" IS NULL AND cardinality("approved_social_account_ids") = 0
    WHEN "status" = 'PENDING_APPROVAL'
      THEN "candidate_content_id" IS NOT NULL AND "approved_content_id" IS NULL AND "publication_progress" IS NULL AND cardinality("approved_social_account_ids") = 0
    WHEN "status" = 'APPROVED'
      THEN "approved_content_id" IS NOT NULL AND "publication_progress" IS NULL
    ELSE "approved_content_id" IS NOT NULL AND "publication_progress" IS NOT NULL
  END) IS TRUE);
ALTER TABLE "campaign_generations"
  ADD CONSTRAINT "campaign_generations_number_check" CHECK ("number" BETWEEN 1 AND 9007199254740991),
  ADD CONSTRAINT "campaign_generations_snapshot_check" CHECK (jsonb_typeof("snapshot") = 'object');
ALTER TABLE "generated_contents"
  ADD CONSTRAINT "generated_contents_text_check" CHECK (
    length(btrim("headline")) > 0 AND length(btrim("caption")) > 0 AND length(btrim("cta")) > 0),
  ADD CONSTRAINT "generated_contents_arrays_check" CHECK (
    cardinality("asset_ids") > 0 AND array_position("asset_ids", NULL) IS NULL AND array_position("hashtags", NULL) IS NULL);

-- These records are append-only, including historical generations no longer referenced by the root.
CREATE FUNCTION campaign_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Campaign history is immutable.';
END;
$$;
CREATE TRIGGER campaign_generations_immutable BEFORE UPDATE OR DELETE ON "campaign_generations"
  FOR EACH ROW EXECUTE FUNCTION campaign_history_immutable();
CREATE TRIGGER generated_contents_immutable BEFORE UPDATE OR DELETE ON "generated_contents"
  FOR EACH ROW EXECUTE FUNCTION campaign_history_immutable();
CREATE TRIGGER campaign_generation_failures_immutable BEFORE UPDATE OR DELETE ON "campaign_generation_failures"
  FOR EACH ROW EXECUTE FUNCTION campaign_history_immutable();

COMMIT;
