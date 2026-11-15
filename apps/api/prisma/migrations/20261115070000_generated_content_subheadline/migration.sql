-- Subtítulo del flyer (ADR-0025). Opcional: el contenido anterior no lo tiene.
ALTER TABLE "generated_contents" ADD COLUMN "subheadline" TEXT;
ALTER TABLE "generated_contents"
  ADD CONSTRAINT "generated_contents_subheadline_check" CHECK (
    "subheadline" IS NULL OR length(btrim("subheadline")) > 0);
