BEGIN;

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('PEN', 'USD', 'EUR');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brand_tone" TEXT,
    "logo_asset_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL,
    "image_asset_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "current_revision_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_revisions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "number" BIGINT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "template_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organizations_created_at_idx" ON "organizations"("created_at");

-- CreateIndex
CREATE INDEX "products_organization_id_created_at_idx" ON "products"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_id_key" ON "products"("organization_id", "id");

-- CreateIndex
CREATE INDEX "templates_organization_id_created_at_idx" ON "templates"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "templates_organization_id_id_key" ON "templates"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "template_revisions_organization_id_template_id_id_key" ON "template_revisions"("organization_id", "template_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "template_revisions_organization_id_template_id_number_key" ON "template_revisions"("organization_id", "template_id", "number");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
-- The current-revision FK is checked at commit, so both non-null references can be inserted atomically.
ALTER TABLE "templates" ADD CONSTRAINT "templates_organization_id_id_current_revision_id_fkey" FOREIGN KEY ("organization_id", "id", "current_revision_id") REFERENCES "template_revisions"("organization_id", "template_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey
ALTER TABLE "template_revisions" ADD CONSTRAINT "template_revisions_organization_id_template_id_fkey" FOREIGN KEY ("organization_id", "template_id") REFERENCES "templates"("organization_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Domain constraints not expressible in the Prisma schema.
ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "organizations_dates_check" CHECK ("updated_at" >= "created_at");
ALTER TABLE "products"
  ADD CONSTRAINT "products_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "products_amount_check" CHECK ("amount_minor" BETWEEN 0 AND 9007199254740991),
  ADD CONSTRAINT "products_dates_check" CHECK ("updated_at" >= "created_at"),
  ADD CONSTRAINT "products_assets_check" CHECK (array_position("image_asset_ids", NULL) IS NULL);
ALTER TABLE "templates"
  ADD CONSTRAINT "templates_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "templates_dates_check" CHECK ("updated_at" >= "created_at");
ALTER TABLE "template_revisions"
  ADD CONSTRAINT "template_revisions_number_check" CHECK ("number" BETWEEN 1 AND 9007199254740991),
  ADD CONSTRAINT "template_revisions_dimensions_check" CHECK ("width" = 1080 AND "height" = 1080);

COMMIT;
