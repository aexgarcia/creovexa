CREATE TYPE "CampaignCopyStatus" AS ENUM ('RUNNING', 'READY', 'FAILED');
CREATE TABLE campaign_copies (
 generation_id UUID PRIMARY KEY,
 organization_id UUID NOT NULL,
 campaign_id UUID NOT NULL,
 token UUID NOT NULL,
 status "CampaignCopyStatus" NOT NULL,
 expires_at TIMESTAMPTZ(3) NOT NULL,
 content JSONB,
 CONSTRAINT campaign_copies_generation_fkey FOREIGN KEY (organization_id,campaign_id,generation_id) REFERENCES campaign_generations(organization_id,campaign_id,id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT campaign_copies_content_check CHECK ((status = 'READY' AND content IS NOT NULL AND jsonb_typeof(content) = 'object') OR (status <> 'READY' AND content IS NULL))
);
CREATE INDEX campaign_copies_owner_idx ON campaign_copies(organization_id,campaign_id);
CREATE UNIQUE INDEX campaign_copies_owner_generation_key ON campaign_copies(organization_id,campaign_id,generation_id);
