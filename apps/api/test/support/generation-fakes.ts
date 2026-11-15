import type {
  CampaignCopyRepository,
  CopyEditResult,
  CopyLease,
  CopySelection,
} from '#app/modules/content-generation/application/ports/campaign-copy-repository';
import type { CampaignCopy } from '#app/modules/content-generation/application/ports/copy-generator';
import {
  copyBrief,
  type FlyerTexts,
} from '#app/modules/content-generation/application/copy-policy';
import type { GenerationJobState } from '#app/modules/content-generation/application/generation-job';
import { domainFixture } from './campaign-fakes.js';
import { buildFlyerBrief } from '#app/modules/content-generation/application/flyer-brief';
import type { ImageArtifact } from '#app/modules/content-generation/application/ports/image-artifact';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';

// Copy que la política acepta: nombre del producto y precios exactos en el caption.
export function validCopy(input = domainFixture().snapshot.data): CampaignCopy {
  const brief = copyBrief(input);
  return {
    headline: input.product.name,
    subheadline: null,
    caption: [input.product.name, ...brief.requiredPriceTexts].join('\n'),
    cta: input.cta,
    hashtags: [],
  };
}

// Una fila de copy por prueba, con los mismos estados que guarda el repositorio de Prisma.
export class CopyRepositoryFake implements CampaignCopyRepository {
  saved: CampaignCopy | null = null;
  busy = false;
  queued = false;
  failure: string | null = null;
  releases = 0;
  // Lo que responde editFlyerTexts cuando no corresponde editar.
  editResult: CopyEditResult = 'UPDATED';
  find(_selection: CopySelection) {
    return Promise.resolve(this.saved);
  }
  claim(_lease: CopyLease) {
    if (this.busy) return Promise.resolve(false);
    this.busy = true;
    this.failure = null;
    return Promise.resolve(true);
  }
  complete(_lease: CopyLease, content: CampaignCopy) {
    this.saved = content;
    this.busy = false;
    this.queued = false;
    return Promise.resolve();
  }
  release(_lease: CopyLease) {
    this.busy = false;
    this.releases++;
    return Promise.resolve();
  }
  state(_selection: CopySelection): Promise<GenerationJobState | null> {
    if (this.saved) return Promise.resolve({ status: 'READY' });
    if (this.failure) return Promise.resolve({ status: 'FAILED', failureCode: this.failure });
    if (this.busy) return Promise.resolve({ status: 'RUNNING' });
    if (this.queued) return Promise.resolve({ status: 'QUEUED' });
    return Promise.resolve(null);
  }
  queue() {
    if (!this.saved && !this.busy) {
      this.queued = true;
      this.failure = null;
    }
    return Promise.resolve();
  }
  store(_selection: CopySelection, content: CampaignCopy) {
    this.saved = content;
    return Promise.resolve();
  }
  editFlyerTexts(_selection: CopySelection, texts: FlyerTexts): Promise<CopyEditResult> {
    if (this.editResult !== 'UPDATED') return Promise.resolve(this.editResult);
    if (!this.saved) return Promise.resolve('COPY_NOT_READY');
    this.saved = { ...this.saved, ...texts };
    return Promise.resolve('UPDATED');
  }
  fail(_selection: CopySelection, failureCode: string) {
    if (!this.saved) this.failure = failureCode;
    this.queued = false;
    return Promise.resolve();
  }
}

// Lo que el compositor recibe además en AI_FULL; COMPOSED lo ignora.
export function composedRenderExtras(
  snapshot: GenerationSnapshotData,
  baseImage: ImageArtifact,
  headline = 'Titular del flyer',
) {
  return {
    baseImage,
    brief: buildFlyerBrief(snapshot, { headline, subheadline: null }, null),
    logo: null,
  };
}
