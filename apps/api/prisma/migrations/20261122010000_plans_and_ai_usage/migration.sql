-- Planes y cuotas de uso de IA (ADR-0033).
CREATE TYPE "PlanCode" AS ENUM ('EMPRENDE', 'NEGOCIO', 'AGENCIA');
CREATE TYPE "AiUsageKind" AS ENUM ('IMAGE', 'COPY', 'PRODUCT_SUGGESTION');
CREATE TYPE "AiUsageScope" AS ENUM ('MONTH', 'DAY');

CREATE TABLE "organization_plans" (
  "organization_id" UUID NOT NULL,
  "plan" "PlanCode" NOT NULL,
  "period_anchor" DATE NOT NULL,
  "assigned_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organization_plans_pkey" PRIMARY KEY ("organization_id"),
  CONSTRAINT "organization_plans_organization_id_fkey" FOREIGN KEY ("organization_id")
    REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE "ai_usage" (
  "organization_id" UUID NOT NULL,
  "kind" "AiUsageKind" NOT NULL,
  "scope" "AiUsageScope" NOT NULL,
  "period_start" DATE NOT NULL,
  "used" INTEGER NOT NULL CHECK ("used" >= 0),
  CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("organization_id", "kind", "scope", "period_start"),
  CONSTRAINT "ai_usage_organization_id_fkey" FOREIGN KEY ("organization_id")
    REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- Las organizaciones existentes quedan en NEGOCIO desde hoy, en su zona horaria, para no cortar
-- el entorno de desarrollo.
INSERT INTO "organization_plans" ("organization_id", "plan", "period_anchor", "assigned_at")
SELECT "id", 'NEGOCIO', (now() AT TIME ZONE "time_zone")::date, now()
FROM "organizations";
