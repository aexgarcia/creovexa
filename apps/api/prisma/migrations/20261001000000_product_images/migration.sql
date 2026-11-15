CREATE TABLE "product_image_assets" (
  "id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "bucket" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "sha256" TEXT NOT NULL CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  "byte_length" INTEGER NOT NULL CHECK ("byte_length" > 0 AND "byte_length" <= 10485760),
  "content_type" TEXT NOT NULL CHECK ("content_type" IN ('image/png', 'image/jpeg', 'image/webp')),
  "width" INTEGER NOT NULL CHECK ("width" > 0),
  "height" INTEGER NOT NULL CHECK ("height" > 0),
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "product_image_assets_organization_id_product_id_fkey"
    FOREIGN KEY ("organization_id", "product_id") REFERENCES "products" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "product_image_assets_object_key_key" ON "product_image_assets" ("object_key");
CREATE INDEX "product_image_assets_organization_id_product_id_id_idx" ON "product_image_assets" ("organization_id", "product_id", "id");
ALTER TABLE "products" ADD CONSTRAINT "products_single_image_check" CHECK (cardinality("image_asset_ids") <= 1);
