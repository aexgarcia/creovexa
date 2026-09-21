BEGIN;

-- Earlier increments had no publication history from which to reconstruct these summaries.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "campaigns" WHERE "publication_progress" IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Reconcile existing publication summaries before applying this migration.';
  END IF;
END;
$$;

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK');

-- CreateEnum
CREATE TYPE "PublicationFailureCode" AS ENUM ('REJECTED', 'ACCOUNT_UNAVAILABLE', 'RATE_LIMITED');

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "approved_content_id" UUID NOT NULL,
    "social_account_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "status" "PublicationStatus" NOT NULL,
    "current_attempt_id" UUID,
    "external_post_id" TEXT,
    "failure_code" "PublicationFailureCode",
    "published_at" TIMESTAMPTZ(3),
    "version" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_attempts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "number" BIGINT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "publication_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_attempt_results" (
    "attempt_id" UUID NOT NULL,
    "status" "PublicationStatus" NOT NULL,
    "external_post_id" TEXT,
    "failure_code" "PublicationFailureCode",
    "recorded_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "publication_attempt_results_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateIndex
CREATE INDEX "publications_organization_id_campaign_id_created_at_idx" ON "publications"("organization_id", "campaign_id", "created_at");

-- CreateIndex
CREATE INDEX "publications_organization_id_status_created_at_idx" ON "publications"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "publications_status_created_at_idx" ON "publications"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "publications_organization_id_id_key" ON "publications"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "publications_destination_key" ON "publications"("organization_id", "campaign_id", "approved_content_id", "social_account_id");

-- CreateIndex
CREATE INDEX "publication_attempts_organization_id_publication_id_started_idx" ON "publication_attempts"("organization_id", "publication_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "publication_attempts_organization_id_publication_id_id_key" ON "publication_attempts"("organization_id", "publication_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "publication_attempts_number_key" ON "publication_attempts"("organization_id", "publication_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "generated_contents_owner_id_key" ON "generated_contents"("organization_id", "campaign_id", "id");

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_organization_id_campaign_id_fkey" FOREIGN KEY ("organization_id", "campaign_id") REFERENCES "campaigns"("organization_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_organization_id_campaign_id_approved_content__fkey" FOREIGN KEY ("organization_id", "campaign_id", "approved_content_id") REFERENCES "generated_contents"("organization_id", "campaign_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_current_attempt_fkey" FOREIGN KEY ("organization_id", "id", "current_attempt_id") REFERENCES "publication_attempts"("organization_id", "publication_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey
ALTER TABLE "publication_attempts" ADD CONSTRAINT "publication_attempts_organization_id_publication_id_fkey" FOREIGN KEY ("organization_id", "publication_id") REFERENCES "publications"("organization_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "publication_attempt_results" ADD CONSTRAINT "publication_attempt_results_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "publication_attempts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "publications"
  ADD CONSTRAINT "publications_version_check" CHECK ("version" BETWEEN 0 AND 9007199254740991),
  ADD CONSTRAINT "publications_dates_check" CHECK ("updated_at" >= "created_at"),
  ADD CONSTRAINT "publications_state_check" CHECK ((CASE "status"
    WHEN 'PENDING' THEN "current_attempt_id" IS NULL AND "version" = 0 AND "updated_at" = "created_at" AND "external_post_id" IS NULL AND "failure_code" IS NULL AND "published_at" IS NULL
    WHEN 'PUBLISHING' THEN "current_attempt_id" IS NOT NULL AND "version" > 0 AND "external_post_id" IS NULL AND "failure_code" IS NULL AND "published_at" IS NULL
    WHEN 'PUBLISHED' THEN "current_attempt_id" IS NOT NULL AND "version" > 0 AND "external_post_id" IS NOT NULL AND length(btrim("external_post_id")) > 0 AND "failure_code" IS NULL AND "published_at" = "updated_at"
    WHEN 'FAILED' THEN "current_attempt_id" IS NOT NULL AND "version" > 0 AND "external_post_id" IS NULL AND "failure_code" IS NOT NULL AND "published_at" IS NULL
  END) IS TRUE);
ALTER TABLE "publication_attempts"
  ADD CONSTRAINT "publication_attempts_number_check" CHECK ("number" BETWEEN 1 AND 4503599627370496);
ALTER TABLE "publication_attempt_results"
  ADD CONSTRAINT "publication_attempt_results_state_check" CHECK ((
    ("status" = 'PUBLISHED' AND "external_post_id" IS NOT NULL AND length(btrim("external_post_id")) > 0 AND "failure_code" IS NULL) OR
    ("status" = 'FAILED' AND "external_post_id" IS NULL AND "failure_code" IS NOT NULL)) IS TRUE);

CREATE FUNCTION publication_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Publication history is immutable.';
END;
$$;
CREATE TRIGGER publication_attempts_immutable BEFORE UPDATE OR DELETE ON "publication_attempts"
  FOR EACH ROW EXECUTE FUNCTION publication_history_immutable();
CREATE TRIGGER publication_attempt_results_immutable BEFORE UPDATE OR DELETE ON "publication_attempt_results"
  FOR EACH ROW EXECUTE FUNCTION publication_history_immutable();

CREATE FUNCTION publication_identity_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Publication identity is immutable.';
  END IF;
  IF (NEW.id, NEW.organization_id, NEW.campaign_id, NEW.approved_content_id, NEW.social_account_id, NEW.platform, NEW.created_at)
    IS DISTINCT FROM (OLD.id, OLD.organization_id, OLD.campaign_id, OLD.approved_content_id, OLD.social_account_id, OLD.platform, OLD.created_at)
    OR OLD.status = 'PUBLISHED' OR NEW.version <> OLD.version + 1 OR NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Invalid publication update.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER publication_identity_immutable BEFORE UPDATE OR DELETE ON "publications"
  FOR EACH ROW EXECUTE FUNCTION publication_identity_immutable();

-- Use the triggering table's schema: tests and deployments may use a non-public namespace.
CREATE FUNCTION campaign_publications_consistent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  campaign_id UUID;
  campaign RECORD;
  actual JSONB;
  summary JSONB;
  invalid BOOLEAN;
  total BIGINT;
  published BIGINT;
  active BIGINT;
  expected_status TEXT;
BEGIN
  IF TG_TABLE_NAME = 'campaigns' THEN campaign_id := NEW.id;
  ELSE campaign_id := NEW.campaign_id;
  END IF;
  EXECUTE format('SELECT * FROM %I.campaigns WHERE id = $1 FOR UPDATE', TG_TABLE_SCHEMA) INTO campaign USING campaign_id;
  IF campaign.id IS NULL THEN RETURN NULL; END IF;
  EXECUTE format('SELECT count(*), count(*) FILTER (WHERE status = ''PUBLISHED''), count(*) FILTER (WHERE status IN (''PENDING'', ''PUBLISHING'')),
    bool_or(organization_id <> $2 OR approved_content_id IS DISTINCT FROM $3 OR NOT (social_account_id = ANY($4)) OR created_at < $5 OR updated_at > $6),
    jsonb_agg(jsonb_build_object(''publicationId'', id, ''organizationId'', organization_id, ''campaignId'', campaign_id,
      ''approvedContentId'', approved_content_id, ''socialAccountId'', social_account_id, ''status'', status, ''version'', version) ORDER BY id)
    FROM %I.publications WHERE campaign_id = $1', TG_TABLE_SCHEMA)
    INTO total, published, active, invalid, actual
    USING campaign_id, campaign.organization_id, campaign.approved_content_id, campaign.approved_social_account_ids, campaign.created_at, campaign.updated_at;
  IF total = 0 AND campaign.publication_progress IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_agg(value ORDER BY value->>'publicationId') INTO summary FROM jsonb_array_elements(campaign.publication_progress);
  expected_status := CASE WHEN active > 0 THEN 'PUBLISHING' WHEN published = total THEN 'PUBLISHED' WHEN published > 0 THEN 'PARTIALLY_PUBLISHED' ELSE 'FAILED' END;
  IF total = 0 OR invalid OR total <> cardinality(campaign.approved_social_account_ids) OR actual IS DISTINCT FROM summary OR campaign.status::text <> expected_status THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Publication summary is inconsistent.';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER campaigns_publications_consistent AFTER INSERT OR UPDATE ON "campaigns"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION campaign_publications_consistent();
CREATE CONSTRAINT TRIGGER publications_campaign_consistent AFTER INSERT OR UPDATE ON "publications"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION campaign_publications_consistent();

CREATE FUNCTION publication_attempt_consistent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  publication_id UUID;
  publication RECORD;
  attempt RECORD;
  outcome RECORD;
  highest BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'publications' THEN publication_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'publication_attempts' THEN publication_id := NEW.publication_id;
  ELSE
    EXECUTE format('SELECT publication_id FROM %I.publication_attempts WHERE id = $1', TG_TABLE_SCHEMA) INTO publication_id USING NEW.attempt_id;
  END IF;
  EXECUTE format('SELECT * FROM %I.publications WHERE id = $1', TG_TABLE_SCHEMA) INTO publication USING publication_id;
  EXECUTE format('SELECT max(number) FROM %I.publication_attempts WHERE publication_id = $1', TG_TABLE_SCHEMA) INTO highest USING publication_id;
  IF publication.current_attempt_id IS NULL AND highest IS NULL THEN RETURN NULL; END IF;
  EXECUTE format('SELECT * FROM %I.publication_attempts WHERE id = $1', TG_TABLE_SCHEMA) INTO attempt USING publication.current_attempt_id;
  EXECUTE format('SELECT * FROM %I.publication_attempt_results WHERE attempt_id = $1', TG_TABLE_SCHEMA) INTO outcome USING publication.current_attempt_id;
  IF attempt.id IS NULL OR attempt.number IS DISTINCT FROM highest OR attempt.started_at < publication.created_at OR attempt.started_at > publication.updated_at
    OR publication.version <> 2 * attempt.number - (CASE WHEN publication.status = 'PUBLISHING' THEN 1 ELSE 0 END)
    OR (publication.status = 'PUBLISHING' AND outcome.attempt_id IS NOT NULL)
    OR (publication.status IN ('PUBLISHED', 'FAILED') AND (outcome.attempt_id IS NULL OR outcome.status <> publication.status
      OR outcome.external_post_id IS DISTINCT FROM publication.external_post_id OR outcome.failure_code IS DISTINCT FROM publication.failure_code
      OR outcome.recorded_at <> publication.updated_at)) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Publication attempt is inconsistent.';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER publications_attempt_consistent AFTER INSERT OR UPDATE ON "publications"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION publication_attempt_consistent();
CREATE CONSTRAINT TRIGGER publication_attempts_consistent AFTER INSERT ON "publication_attempts"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION publication_attempt_consistent();
CREATE CONSTRAINT TRIGGER publication_results_consistent AFTER INSERT ON "publication_attempt_results"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION publication_attempt_consistent();

COMMIT;
