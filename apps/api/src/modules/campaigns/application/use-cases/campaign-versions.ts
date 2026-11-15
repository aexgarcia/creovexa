import type { Clock } from '#app/application/ports/clock';
import { entityId } from '#app/domain/entity-id';
import {
  ConcurrentCampaignModificationError,
  InvalidCampaignTransitionError,
} from '../../domain/errors/campaign.errors.js';
import type {
  CampaignRepository,
  CampaignVersion,
} from '../../domain/repositories/campaign.repository.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import {
  CampaignResource,
  CampaignResourceNotFoundError,
} from '../errors/campaign-resource-not-found.error.js';
import { loadCampaign, type CampaignSelection } from '../load-campaign.js';

export interface CampaignVersionResult {
  generationId: string;
  number: number;
  requestedAt: string;
  // La versión vigente de la campaña.
  current: boolean;
  content: {
    id: string;
    headline: string;
    subheadline: string | null;
    caption: string;
    cta: string;
    hashtags: string[];
    assetIds: string[];
    createdAt: string;
  } | null;
  failure: string | null;
  // Los precios congelados en su snapshot: una versión anterior puede tener otros.
  prices: {
    regular: { amountMinor: number; currency: string };
    promotion: { amountMinor: number; currency: string } | null;
  };
}

function versionResult(version: CampaignVersion, currentId: string | null): CampaignVersionResult {
  const { generation, content } = version;
  const snapshot = generation.snapshot.data;
  return {
    generationId: generation.id,
    number: generation.number,
    requestedAt: new Date(generation.requestedAt).toISOString(),
    current: generation.id === currentId,
    content: content && {
      id: content.id,
      headline: content.headline,
      subheadline: content.subheadline,
      caption: content.caption,
      cta: content.cta,
      hashtags: [...content.hashtags],
      assetIds: [...content.assetIds],
      createdAt: content.createdAt.toISOString(),
    },
    failure: version.failure,
    prices: {
      regular: { ...snapshot.product.regularPrice },
      promotion: snapshot.promotion
        ? { amountMinor: snapshot.promotion.amountMinor, currency: snapshot.promotion.currency }
        : null,
    },
  };
}

// Historial de versiones del flyer de una campaña (ADR-0026).
export class ListCampaignVersions {
  constructor(private readonly campaigns: CampaignRepository) {}

  async execute(input: CampaignSelection): Promise<CampaignVersionResult[]> {
    const campaign = await loadCampaign(input, this.campaigns);
    const versions = await this.campaigns.listVersions(campaign.organizationId, campaign.id);
    return versions.map((version) => versionResult(version, campaign.generation?.id ?? null));
  }
}

export interface RestoreCampaignVersionInput extends CampaignSelection {
  generationId: string;
  expectedVersion: number;
}

// Vuelve a una versión anterior: su contenido queda pendiente de aprobación (ADR-0026).
export class RestoreCampaignVersion {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RestoreCampaignVersionInput): Promise<CampaignResult> {
    const campaign = await loadCampaign(input, this.campaigns);
    if (campaign.version !== input.expectedVersion) throw new ConcurrentCampaignModificationError();
    const generationId = entityId(input.generationId, 'generationId');
    const version = (await this.campaigns.listVersions(campaign.organizationId, campaign.id)).find(
      (item) => item.generation.id === generationId,
    );
    if (!version) throw new CampaignResourceNotFoundError(CampaignResource.VERSION);
    // Una versión que falló o sigue en curso no tiene flyer que recuperar.
    if (!version.content) throw new InvalidCampaignTransitionError();
    const updated = campaign.restoreVersion(version.generation, version.content, this.clock.now());
    if (updated !== campaign)
      await this.campaigns.save(campaign.organizationId, updated, campaign.version);
    return campaignResult(updated);
  }
}
