-- Datos del producto para el flyer (datos-del-flyer.md, fase 1).
ALTER TABLE "products"
  ADD COLUMN "short_name" TEXT CHECK ("short_name" IS NULL OR char_length("short_name") BETWEEN 1 AND 40),
  ADD COLUMN "product_brand" TEXT CHECK ("product_brand" IS NULL OR char_length("product_brand") BETWEEN 1 AND 80),
  ADD COLUMN "key_attributes" TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality("key_attributes") <= 5),
  ADD COLUMN "unit" TEXT CHECK ("unit" IS NULL OR char_length("unit") BETWEEN 1 AND 30);

-- Qué muestra la foto, lo indica quien la sube. La transparencia la deriva el sistema. Las
-- imágenes anteriores no lo tienen: la tabla es inmutable.
CREATE TYPE "PhotoType" AS ENUM ('CUTOUT', 'STUDIO', 'SCENE', 'PLACE', 'PERSON');
ALTER TABLE "product_image_assets"
  ADD COLUMN "photo_type" "PhotoType",
  ADD COLUMN "has_transparency" BOOLEAN,
  ADD CONSTRAINT "product_image_assets_traits_together"
    CHECK (("photo_type" IS NULL) = ("has_transparency" IS NULL));
