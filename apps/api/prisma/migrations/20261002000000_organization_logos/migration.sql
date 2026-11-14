CREATE TABLE "organization_logo_assets" (
  "id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  "bucket" TEXT NOT NULL,
  "object_key" TEXT NOT NULL UNIQUE,
  "sha256" TEXT NOT NULL CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  "byte_length" INTEGER NOT NULL CHECK ("byte_length" BETWEEN 1 AND 10485760),
  "content_type" TEXT NOT NULL CHECK ("content_type" IN ('image/png', 'image/jpeg', 'image/webp')),
  "width" INTEGER NOT NULL CHECK ("width" > 0),
  "height" INTEGER NOT NULL CHECK ("height" > 0 AND "width"::BIGINT * "height"::BIGINT <= 16000000),
  "created_at" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "organization_logo_assets_organization_id_id_idx" ON "organization_logo_assets"("organization_id", "id");

CREATE FUNCTION organization_logo_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Organization logos are immutable.';
END;
$$;
CREATE TRIGGER organization_logo_assets_immutable BEFORE UPDATE OR DELETE ON "organization_logo_assets"
  FOR EACH ROW EXECUTE FUNCTION organization_logo_immutable();
