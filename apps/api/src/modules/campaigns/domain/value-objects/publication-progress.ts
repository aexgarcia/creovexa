import { entityId, type EntityId } from '#app/domain/entity-id';
import { PublicationStatus } from '#app/domain/publication-status';
import { CampaignStatus } from '../campaign-status.js';
import {
  InvalidPublicationSummaryError,
  StalePublicationSummaryError,
} from '../errors/campaign.errors.js';

/** Consumer-owned read contract. It carries no Publication entity or provider payload. */
export interface CampaignPublication {
  publicationId: string;
  organizationId: string;
  campaignId: string;
  approvedContentId: string;
  socialAccountId: string;
  status: PublicationStatus;
  version: number;
}

function normalize(input: readonly CampaignPublication[]) {
  if (!Array.isArray(input) || input.length === 0) throw new InvalidPublicationSummaryError();
  const entries = input
    .map((item) => {
      if (
        !Object.values(PublicationStatus).includes(item.status) ||
        !Number.isSafeInteger(item.version) ||
        item.version < 0
      )
        throw new InvalidPublicationSummaryError();
      return Object.freeze({
        publicationId: entityId(item.publicationId, 'publicationId'),
        organizationId: entityId(item.organizationId, 'organizationId'),
        campaignId: entityId(item.campaignId, 'campaignId'),
        approvedContentId: entityId(item.approvedContentId, 'approvedContentId'),
        socialAccountId: entityId(item.socialAccountId, 'socialAccountId'),
        status: item.status,
        version: item.version,
      });
    })
    .sort((a, b) => a.publicationId.localeCompare(b.publicationId));
  if (
    new Set(entries.map((entry) => entry.publicationId)).size !== entries.length ||
    new Set(entries.map((entry) => entry.socialAccountId)).size !== entries.length
  )
    throw new InvalidPublicationSummaryError();
  return Object.freeze(entries);
}

type Entries = ReturnType<typeof normalize>;

export class PublicationProgress {
  private constructor(readonly entries: Entries) {
    Object.freeze(this);
  }

  static start(
    organizationId: EntityId,
    campaignId: EntityId,
    approvedContentId: EntityId,
    socialAccountIds: readonly EntityId[],
    input: readonly CampaignPublication[],
  ): PublicationProgress {
    const entries = normalize(input);
    if (
      entries.length !== socialAccountIds.length ||
      entries.some(
        (entry) =>
          entry.organizationId !== organizationId ||
          entry.campaignId !== campaignId ||
          entry.approvedContentId !== approvedContentId ||
          !socialAccountIds.includes(entry.socialAccountId) ||
          entry.status !== PublicationStatus.PENDING ||
          entry.version !== 0,
      )
    )
      throw new InvalidPublicationSummaryError();
    return new PublicationProgress(entries);
  }

  record(input: readonly CampaignPublication[]): PublicationProgress {
    const entries = this.matchEntries(input);
    let changed = false;
    entries.forEach((next, index) => {
      const previous = this.entries[index]!;
      if (next.version < previous.version) throw new StalePublicationSummaryError();
      if (next.version === previous.version) {
        if (next.status !== previous.status) throw new InvalidPublicationSummaryError();
        return;
      }
      const canAdvance =
        (previous.status === PublicationStatus.PENDING &&
          next.status !== PublicationStatus.PENDING) ||
        (previous.status === PublicationStatus.PUBLISHING &&
          [PublicationStatus.PUBLISHED, PublicationStatus.FAILED].includes(next.status));
      if (!canAdvance) throw new InvalidPublicationSummaryError();
      changed = true;
    });
    return changed ? new PublicationProgress(entries) : this;
  }

  retry(input: readonly CampaignPublication[]): PublicationProgress {
    const entries = this.matchEntries(input);
    let retried = false;
    entries.forEach((next, index) => {
      const previous = this.entries[index]!;
      if (previous.status === PublicationStatus.PUBLISHED) {
        if (next.status !== previous.status || next.version !== previous.version)
          throw new InvalidPublicationSummaryError();
      } else if (
        previous.status === PublicationStatus.FAILED &&
        next.status === PublicationStatus.PUBLISHING &&
        next.version > previous.version
      ) {
        retried = true;
      } else {
        throw new InvalidPublicationSummaryError();
      }
    });
    if (!retried) throw new InvalidPublicationSummaryError();
    return new PublicationProgress(entries);
  }

  private matchEntries(input: readonly CampaignPublication[]): Entries {
    const entries = normalize(input);
    if (
      entries.length !== this.entries.length ||
      entries.some((entry, index) => {
        const previous = this.entries[index]!;
        return (
          entry.publicationId !== previous.publicationId ||
          entry.organizationId !== previous.organizationId ||
          entry.campaignId !== previous.campaignId ||
          entry.approvedContentId !== previous.approvedContentId ||
          entry.socialAccountId !== previous.socialAccountId
        );
      })
    )
      throw new InvalidPublicationSummaryError();
    return entries;
  }

  get status(): CampaignStatus {
    if (
      this.entries.some((entry) =>
        [PublicationStatus.PENDING, PublicationStatus.PUBLISHING].includes(entry.status),
      )
    )
      return CampaignStatus.PUBLISHING;
    const published = this.entries.filter(
      (entry) => entry.status === PublicationStatus.PUBLISHED,
    ).length;
    if (published === this.entries.length) return CampaignStatus.PUBLISHED;
    return published > 0 ? CampaignStatus.PARTIALLY_PUBLISHED : CampaignStatus.FAILED;
  }
}
