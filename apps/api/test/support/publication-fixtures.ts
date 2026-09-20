import { Publication } from '#app/modules/publications/domain/entities/publication';
import { SocialPlatform } from '#app/modules/publications/domain/social-platform';
import type { CampaignPublication } from '#app/modules/campaigns/domain/value-objects/publication-progress';
import { domainFixture, testId, ORG, CAMPAIGN, CONTENT, NOW } from './campaign-fakes.js';

export const ACCOUNT_ONE = testId(211);
export const ACCOUNT_TWO = testId(212);
export const ATTEMPT_ONE = testId(301);
export const ATTEMPT_TWO = testId(302);
export const RETRY = testId(303);

export function pendingPublications(): [Publication, Publication] {
  return [
    Publication.create(
      testId(201),
      {
        organizationId: ORG,
        campaignId: CAMPAIGN,
        approvedContentId: CONTENT,
        socialAccountId: ACCOUNT_ONE,
        platform: SocialPlatform.FACEBOOK,
      },
      new Date(NOW),
    ),
    Publication.create(
      testId(202),
      {
        organizationId: ORG,
        campaignId: CAMPAIGN,
        approvedContentId: CONTENT,
        socialAccountId: ACCOUNT_TWO,
        platform: SocialPlatform.INSTAGRAM,
      },
      new Date(NOW),
    ),
  ];
}

export function summary(...publications: Publication[]): CampaignPublication[] {
  return publications.map((publication) => ({
    publicationId: publication.id,
    organizationId: publication.organizationId,
    campaignId: publication.campaignId,
    approvedContentId: publication.approvedContentId,
    socialAccountId: publication.socialAccountId,
    status: publication.status,
    version: publication.version,
  }));
}

export function publicationCampaign() {
  return domainFixture().pending.approve(CONTENT, new Date(NOW), [ACCOUNT_ONE, ACCOUNT_TWO]);
}
