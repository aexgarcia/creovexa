-- Kit de marca, fase 2 (datos-del-flyer.md): tipografía, estilo visual, contacto, texto legal
-- por defecto y palabras prohibidas.
CREATE TYPE "Typography" AS ENUM ('SANS_MODERN', 'SERIF_ELEGANT', 'ROUNDED', 'CONDENSED_BOLD', 'HANDWRITTEN');
ALTER TABLE "organizations"
  ADD COLUMN "typography" "Typography",
  ADD COLUMN "visual_style" TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality("visual_style") <= 5),
  ADD COLUMN "contact" JSONB CHECK ("contact" IS NULL OR jsonb_typeof("contact") = 'object'),
  ADD COLUMN "default_legal_text" TEXT CHECK ("default_legal_text" IS NULL OR char_length("default_legal_text") BETWEEN 1 AND 200),
  ADD COLUMN "forbidden_words" TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality("forbidden_words") <= 20);
