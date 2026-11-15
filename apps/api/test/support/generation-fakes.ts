import type {
  CampaignCopyRepository,
  CopyLease,
  CopySelection,
} from '#app/modules/content-generation/application/ports/campaign-copy-repository';
import type { CampaignCopy } from '#app/modules/content-generation/application/ports/copy-generator';
import { copyChoices } from '#app/modules/content-generation/application/copy-policy';
import type { GenerationJobState } from '#app/modules/content-generation/application/generation-job';
import { domainFixture } from './campaign-fakes.js';

export function validCopy(input = domainFixture().snapshot.data): CampaignCopy {
  const options = copyChoices(input);
  return {
    headline: options.headline[0]!,
    caption: options.caption[0]!,
    cta: options.cta[0]!,
    hashtags: [],
    imagePrompt: options.imagePrompt[0]!,
  };
}

// Una fila de copy por prueba, con los mismos estados que guarda el repositorio de Prisma.
export class CopyRepositoryFake implements CampaignCopyRepository {
  saved: CampaignCopy | null = null;
  busy = false;
  queued = false;
  failure: string | null = null;
  releases = 0;
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
  fail(_selection: CopySelection, failureCode: string) {
    if (!this.saved) this.failure = failureCode;
    this.queued = false;
    return Promise.resolve();
  }
}
