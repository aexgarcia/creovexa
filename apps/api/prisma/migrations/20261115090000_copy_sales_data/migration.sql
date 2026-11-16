-- Datos de venta del producto y voz de la marca para el copy (ADR-0029).
ALTER TABLE "products"
  ADD COLUMN "benefits" TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality("benefits") <= 5),
  ADD COLUMN "ideal_for" TEXT CHECK ("ideal_for" IS NULL OR char_length("ideal_for") BETWEEN 1 AND 200);

CREATE TYPE "EmojiStyle" AS ENUM ('NONE', 'FEW', 'EXPRESSIVE');
CREATE TYPE "AddressForm" AS ENUM ('TU', 'USTED');
ALTER TABLE "organizations"
  ADD COLUMN "audience" TEXT CHECK ("audience" IS NULL OR char_length("audience") BETWEEN 1 AND 200),
  ADD COLUMN "value_props" TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality("value_props") <= 3),
  ADD COLUMN "emoji_style" "EmojiStyle" NOT NULL DEFAULT 'FEW',
  ADD COLUMN "address_form" "AddressForm" NOT NULL DEFAULT 'TU',
  ADD COLUMN "copy_examples" TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality("copy_examples") <= 3);
