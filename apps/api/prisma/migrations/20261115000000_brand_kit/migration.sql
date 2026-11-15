-- Kit de marca (ADR-0022): rubro, región y colores de marca de la organización.
ALTER TABLE "organizations"
  ADD COLUMN "industry" TEXT CHECK ("industry" IS NULL OR char_length("industry") BETWEEN 1 AND 80),
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'PE' CHECK ("country" ~ '^[A-Z]{2}$'),
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'es-PE' CHECK (char_length("locale") BETWEEN 2 AND 35),
  ADD COLUMN "time_zone" TEXT NOT NULL DEFAULT 'America/Lima' CHECK (char_length("time_zone") BETWEEN 1 AND 64),
  ADD COLUMN "default_currency" "Currency" NOT NULL DEFAULT 'PEN',
  ADD COLUMN "brand_colors" JSONB CHECK ("brand_colors" IS NULL OR jsonb_typeof("brand_colors") = 'object');

-- Lo que el sistema deriva de cada logo al subirlo. Los logos anteriores no lo tienen: la tabla
-- es inmutable y el análisis necesita los bytes.
ALTER TABLE "organization_logo_assets"
  ADD COLUMN "is_dark" BOOLEAN,
  ADD COLUMN "suggested_colors" JSONB CHECK ("suggested_colors" IS NULL OR jsonb_typeof("suggested_colors") = 'object'),
  ADD CONSTRAINT "organization_logo_assets_traits_together"
    CHECK (("is_dark" IS NULL) = ("suggested_colors" IS NULL));
