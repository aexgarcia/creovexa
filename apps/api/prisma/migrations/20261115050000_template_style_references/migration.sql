-- Plantillas, fase 2 (ADR-0023): indicaciones fijas y hasta 2 referencias de estilo por revisión.
-- Ambas viven en el diseño; las revisiones anteriores no las tienen y siguen siendo válidas.
ALTER TABLE "template_revisions" DROP CONSTRAINT "template_revisions_design_valid";
ALTER TABLE "template_revisions" ADD CONSTRAINT "template_revisions_design_valid" CHECK (
  (jsonb_typeof("design") = 'object'
   AND "design" - ARRAY['format', 'composition', 'style', 'mode', 'background', 'logoPosition', 'textDensity', 'elements', 'instructions', 'styleReferenceAssetIds'] = '{}'::jsonb
   AND "design"->>'format' IN ('SQUARE', 'PORTRAIT', 'STORY')
   AND "design"->>'composition' IN ('PRODUCT_HERO', 'PRODUCT_PANEL', 'SCENE', 'SPLIT', 'TYPOGRAPHIC')
   AND "design"->>'style' IN ('MINIMALIST', 'BOLD', 'ELEGANT', 'PLAYFUL', 'CORPORATE', 'NATURAL')
   AND "design"->>'mode' IN ('DARK', 'LIGHT')
   AND "design"->>'background' IN ('BRAND_COLOR', 'GRADIENT', 'SCENE', 'STUDIO')
   AND "design"->>'logoPosition' IN ('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT')
   AND "design"->>'textDensity' IN ('MINIMAL', 'BALANCED')
   AND jsonb_typeof("design"->'elements') = 'object'
   AND ("design"->'elements') - ARRAY['logo', 'headline', 'subheadline', 'productName', 'keyAttributes', 'regularPrice', 'promotionPrice', 'validity', 'cta', 'contact', 'legalText'] = '{}'::jsonb
   AND jsonb_typeof("design"#>'{elements,logo}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,headline}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,subheadline}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,productName}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,regularPrice}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,promotionPrice}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,validity}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,cta}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,contact}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,legalText}') = 'boolean'
   AND jsonb_typeof("design"#>'{elements,keyAttributes}') = 'number'
   AND ("design"#>>'{elements,keyAttributes}')::numeric IN (0, 1, 2, 3, 4)
   AND (NOT "design" ? 'instructions'
        OR jsonb_typeof("design"->'instructions') = 'null'
        OR (jsonb_typeof("design"->'instructions') = 'string'
            AND char_length("design"->>'instructions') BETWEEN 1 AND 300))
   AND (NOT "design" ? 'styleReferenceAssetIds'
        OR (jsonb_typeof("design"->'styleReferenceAssetIds') = 'array'
            AND jsonb_array_length("design"->'styleReferenceAssetIds') <= 2))
   AND "width" = 1080
   AND "height" = CASE "design"->>'format' WHEN 'SQUARE' THEN 1080 WHEN 'PORTRAIT' THEN 1350 ELSE 1920 END) IS TRUE
);

-- Imágenes de referencia de estilo. Inmutables: una revisión anterior puede seguir usándolas.
CREATE TABLE "template_style_assets" (
  "id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "bucket" TEXT NOT NULL,
  "object_key" TEXT NOT NULL UNIQUE,
  "sha256" TEXT NOT NULL CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  "byte_length" INTEGER NOT NULL CHECK ("byte_length" BETWEEN 1 AND 10485760),
  "content_type" TEXT NOT NULL CHECK ("content_type" IN ('image/png', 'image/jpeg', 'image/webp')),
  "width" INTEGER NOT NULL CHECK ("width" > 0),
  "height" INTEGER NOT NULL CHECK ("height" > 0),
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "template_style_assets_template_fkey"
    FOREIGN KEY ("organization_id", "template_id") REFERENCES "templates" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "template_style_assets_organization_id_template_id_id_idx" ON "template_style_assets" ("organization_id", "template_id", "id");

CREATE FUNCTION template_style_asset_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Template style assets are immutable.';
END;
$$;
CREATE TRIGGER template_style_assets_immutable BEFORE UPDATE OR DELETE ON "template_style_assets"
  FOR EACH ROW EXECUTE FUNCTION template_style_asset_immutable();
