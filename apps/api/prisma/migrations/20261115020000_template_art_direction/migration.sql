-- Dirección de arte de la plantilla (ADR-0023): reemplaza layout, palette y settings por formato,
-- composición, estilo, modo, fondo, posición del logo, densidad y elementos.
ALTER TABLE "template_revisions" DROP CONSTRAINT "template_revisions_design_valid";
-- Las dimensiones ya no son solo 1080 × 1080: las fija el formato (ver la restricción del final).
ALTER TABLE "template_revisions" DROP CONSTRAINT "template_revisions_dimensions_check";

-- Las revisiones son inmutables; esta conversión única de esquema desactiva el trigger solo
-- mientras dura. Ningún dato de negocio cambia: CLASSIC pasa a PRODUCT_HERO, PRODUCT_FOCUS a
-- PRODUCT_PANEL, las dos paletas (ambas oscuras) a modo DARK, y los interruptores a elementos.
ALTER TABLE "template_revisions" DISABLE TRIGGER template_revisions_immutable;
UPDATE "template_revisions" SET "design" = jsonb_build_object(
  'format', 'SQUARE',
  'composition', CASE "design"->>'layout' WHEN 'PRODUCT_FOCUS' THEN 'PRODUCT_PANEL' ELSE 'PRODUCT_HERO' END,
  'style', 'BOLD',
  'mode', 'DARK',
  'background', 'BRAND_COLOR',
  'logoPosition', 'TOP_LEFT',
  'textDensity', 'BALANCED',
  'elements', jsonb_build_object(
    'logo', ("design"#>>'{settings,showLogo}')::boolean,
    'headline', ("design"#>>'{settings,showHeadline}')::boolean,
    'subheadline', false,
    'productName', true,
    'keyAttributes', 0,
    'regularPrice', ("design"#>>'{settings,showRegularPrice}')::boolean,
    'promotionPrice', ("design"#>>'{settings,showPromotionPrice}')::boolean,
    'validity', true,
    'cta', ("design"#>>'{settings,showCta}')::boolean,
    'contact', false,
    'legalText', false
  )
);
ALTER TABLE "template_revisions" ENABLE TRIGGER template_revisions_immutable;

ALTER TABLE "template_revisions" ALTER COLUMN "design" SET DEFAULT
'{"format":"SQUARE","composition":"PRODUCT_HERO","style":"BOLD","mode":"DARK","background":"BRAND_COLOR","logoPosition":"TOP_RIGHT","textDensity":"BALANCED","elements":{"logo":true,"headline":true,"subheadline":false,"productName":true,"keyAttributes":0,"regularPrice":true,"promotionPrice":true,"validity":true,"cta":true,"contact":false,"legalText":false}}';

ALTER TABLE "template_revisions" ADD CONSTRAINT "template_revisions_design_valid" CHECK (
  (jsonb_typeof("design") = 'object'
   AND "design" - ARRAY['format', 'composition', 'style', 'mode', 'background', 'logoPosition', 'textDensity', 'elements'] = '{}'::jsonb
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
   -- Las dimensiones guardadas son las del formato.
   AND "width" = 1080
   AND "height" = CASE "design"->>'format' WHEN 'SQUARE' THEN 1080 WHEN 'PORTRAIT' THEN 1350 ELSE 1920 END) IS TRUE
);
