-- Canal principal del copy por campaña (ADR-0032).
CREATE TYPE "CopyChannel" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'WHATSAPP');
ALTER TABLE "campaigns" ADD COLUMN "channel" "CopyChannel" NOT NULL DEFAULT 'INSTAGRAM';
