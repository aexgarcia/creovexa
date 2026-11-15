-- Objetivo y ocasión de la campaña (ADR-0024).
CREATE TYPE "CampaignObjective" AS ENUM ('PROMOTION', 'LAUNCH', 'SEASONAL', 'AWARENESS', 'EVENT');

ALTER TABLE "campaigns"
  ADD COLUMN "objective" "CampaignObjective" NOT NULL DEFAULT 'PROMOTION',
  ADD COLUMN "occasion" TEXT,
  ADD CONSTRAINT "campaigns_occasion_check"
    CHECK ("occasion" IS NULL OR (length(btrim("occasion")) > 0 AND length("occasion") <= 60));

-- Un borrador sube de versión con cada edición: ya no está fijo en la versión 0.
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_generation_check";
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_generation_check" CHECK (
  ("status" = 'DRAFT' AND "current_generation_id" IS NULL) OR
  ("status" <> 'DRAFT' AND "current_generation_id" IS NOT NULL AND "version" > 0));
