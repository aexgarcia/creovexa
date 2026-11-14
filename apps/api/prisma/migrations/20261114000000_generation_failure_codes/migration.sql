-- Background generation: the reason a copy or image job failed, shown to the CMS.
ALTER TABLE "campaign_copies" ADD COLUMN "failure_code" TEXT;
ALTER TABLE "campaign_image_jobs" ADD COLUMN "failure_code" TEXT;

-- A requested job that no worker has claimed yet.
ALTER TYPE "CampaignCopyStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "CampaignImageJobStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
