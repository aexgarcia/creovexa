ALTER TABLE "template_revisions" ADD COLUMN "design" JSONB NOT NULL DEFAULT
'{"layout":"CLASSIC","palette":"BLUE","settings":{"showLogo":true,"showRegularPrice":true,"showPromotionPrice":true,"showHeadline":true,"showCta":true,"showMainImage":true}}';

ALTER TABLE "template_revisions" ADD CONSTRAINT "template_revisions_design_valid" CHECK (
  (jsonb_typeof(design) = 'object'
   AND design - ARRAY['layout', 'palette', 'settings'] = '{}'::jsonb
   AND design->>'layout' IN ('CLASSIC', 'PRODUCT_FOCUS')
   AND design->>'palette' IN ('BLUE', 'CORAL')
   AND jsonb_typeof(design->'settings') = 'object'
   AND (design->'settings') - ARRAY['showLogo', 'showRegularPrice', 'showPromotionPrice', 'showHeadline', 'showCta', 'showMainImage'] = '{}'::jsonb
   AND jsonb_typeof(design#>'{settings,showLogo}') = 'boolean'
   AND jsonb_typeof(design#>'{settings,showRegularPrice}') = 'boolean'
   AND jsonb_typeof(design#>'{settings,showPromotionPrice}') = 'boolean'
   AND jsonb_typeof(design#>'{settings,showHeadline}') = 'boolean'
   AND jsonb_typeof(design#>'{settings,showCta}') = 'boolean'
   AND jsonb_typeof(design#>'{settings,showMainImage}') = 'boolean') IS TRUE
);

CREATE FUNCTION template_revision_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Template revisions are immutable.';
END;
$$;

CREATE TRIGGER template_revisions_immutable BEFORE UPDATE OR DELETE ON "template_revisions"
  FOR EACH ROW EXECUTE FUNCTION template_revision_immutable();
