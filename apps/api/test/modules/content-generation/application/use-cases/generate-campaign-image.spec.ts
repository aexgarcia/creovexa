import {
  CampaignClockFake,
  CampaignIdsFake,
  CampaignRepositoryFake,
  CampaignLookupsFake,
  campaignGenerationsFake,
  NO_TRANSACTION,
  domainFixture,
  resourcesFixture,
  testId,
  ORG,
  OTHER_ORG,
  CAMPAIGN,
  GENERATION,
  NEXT_GENERATION,
  briefOf,
} from '../../../../support/campaign-fakes.js';
import { CampaignStatus } from '#app/modules/campaigns/domain/campaign-status';
import {
  CampaignNotFoundError,
  StaleGenerationResultError,
} from '#app/modules/campaigns/domain/errors/campaign.errors';
import { GenerationSnapshot } from '#app/modules/campaigns/domain/value-objects/generation-snapshot';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import type { CampaignCopyRepository } from '#app/modules/content-generation/application/ports/campaign-copy-repository';
import type {
  CampaignImageRepository,
  CampaignImageLease,
  CampaignImageCompletion,
} from '#app/modules/content-generation/application/ports/campaign-image-repository';
import type { ImageArtifact } from '#app/modules/content-generation/application/ports/image-artifact';
import type { ImageGenerator } from '#app/modules/content-generation/application/ports/image-generator';
import type { ProductImageSource } from '#app/modules/content-generation/application/ports/product-image-source';
import type { StorageProvider } from '#app/modules/content-generation/application/ports/storage-provider';
import type { TemplateRenderer } from '#app/modules/content-generation/application/ports/template-renderer';
import { GenerateCampaignImage } from '#app/modules/content-generation/application/use-cases/generate-campaign-image';
import type { CampaignGenerations } from '#app/modules/campaigns/contract';
import type { GenerationJobState } from '#app/modules/content-generation/application/generation-job';
import { validCopy } from '../../../../support/generation-fakes.js';
import type { FlyerLogoSource } from '#app/modules/content-generation/application/ports/flyer-logo-source';
import type { FlyerReader } from '#app/modules/content-generation/application/ports/flyer-reader';
import type { FlyerStyleSource } from '#app/modules/content-generation/application/ports/flyer-style-source';
import { DEFAULT_FLYER_DESIGN } from '#app/domain/value-objects/flyer-design';
import type { FlyerReading } from '#app/modules/content-generation/application/flyer-verification';

// Adapters solo para pruebas: sin llamadas al proveedor, navegador, servicio de almacenamiento ni cableado de producción.
class ImageRepositoryFake implements CampaignImageRepository {
  active: CampaignImageLease | null = null;
  results: CampaignImageCompletion[] = [];
  releases = 0;
  constructor(
    private readonly campaigns: CampaignRepositoryFake,
    private readonly generations: CampaignGenerations,
  ) {}

  claim(lease: CampaignImageLease): Promise<boolean> {
    const current = this.campaigns.records.get(lease.campaignId);
    if (
      !current ||
      current.organizationId !== lease.organizationId ||
      current.generation?.id !== lease.generationId ||
      current.version !== lease.expectedVersion ||
      current.status !== CampaignStatus.GENERATING ||
      (this.active && this.active.expiresAt > lease.now)
    )
      return Promise.resolve(false);
    this.active = lease;
    return Promise.resolve(true);
  }

  async complete(lease: CampaignImageLease, result: CampaignImageCompletion, at: Date) {
    const current = this.campaigns.records.get(lease.campaignId);
    if (
      this.active?.token !== lease.token ||
      lease.expiresAt <= at ||
      !current ||
      current.generation?.id !== lease.generationId ||
      current.version !== lease.expectedVersion ||
      current.organizationId !== lease.organizationId ||
      current.status !== CampaignStatus.GENERATING
    )
      throw new CampaignImageError('STALE_RESULT');
    const content = await this.generations.recordContent(
      {
        organizationId: lease.organizationId,
        campaignId: lease.campaignId,
        generationId: lease.generationId,
        expectedVersion: lease.expectedVersion,
        copy: result.copy,
        finalAssetId: result.finalAsset.id,
        at,
      },
      NO_TRANSACTION,
    );
    this.results.push(result);
    this.active = null;
    return content;
  }

  release(lease: CampaignImageLease): Promise<void> {
    this.releases++;
    if (this.active?.token === lease.token) this.active = null;
    return Promise.resolve();
  }

  queued = 0;
  failure: string | null = null;
  state(): Promise<GenerationJobState | null> {
    if (this.results.length > 0) return Promise.resolve({ status: 'READY' });
    if (this.failure) return Promise.resolve({ status: 'FAILED', failureCode: this.failure });
    if (this.active) return Promise.resolve({ status: 'RUNNING' });
    return Promise.resolve(this.queued > 0 ? { status: 'QUEUED' } : null);
  }
  queue(): Promise<void> {
    this.queued++;
    return Promise.resolve();
  }
  fail(_selection: unknown, failureCode: string): Promise<void> {
    if (this.results.length === 0) this.failure = failureCode;
    return Promise.resolve();
  }
}

// Lo que devuelve el compositor de COMPOSED: el flyer, sin logo pegado aparte.
function composed(final: ImageArtifact) {
  return { final, areaUnderLogo: null, logoPlacement: null };
}

function fixture() {
  const domain = domainFixture();
  const campaigns = new CampaignRepositoryFake();
  campaigns.records.set(CAMPAIGN, domain.generating);
  const savedCopy = {
    ...validCopy(domain.snapshot.data),
    subheadline: 'Subtítulo del flyer',
    hashtags: ['#Producto'],
  };
  const copies = {
    find: vi.fn<CampaignCopyRepository['find']>().mockResolvedValue(savedCopy),
    claim: vi.fn<CampaignCopyRepository['claim']>(),
    complete: vi.fn<CampaignCopyRepository['complete']>(),
    release: vi.fn<CampaignCopyRepository['release']>(),
    state: vi.fn<CampaignCopyRepository['state']>(),
    queue: vi.fn<CampaignCopyRepository['queue']>(),
    fail: vi.fn<CampaignCopyRepository['fail']>(),
    editFlyerTexts: vi.fn<CampaignCopyRepository['editFlyerTexts']>(),
  } satisfies CampaignCopyRepository;
  const referenceImage: ImageArtifact = {
    reference: 'test:product-photo',
    contentType: 'image/jpeg',
    width: 640,
    height: 480,
  };
  const base: ImageArtifact = {
    reference: 'test:base',
    contentType: 'image/webp',
    width: 1024,
    height: 1024,
  };
  const final: ImageArtifact = {
    reference: 'test:final',
    contentType: 'image/png',
    width: 1080,
    height: 1080,
  };
  const productImages = {
    assertAvailable: vi.fn(),
    load: vi.fn<ProductImageSource['load']>().mockResolvedValue(referenceImage),
  };
  const generator = {
    assertAvailable: vi.fn(),
    generate: vi.fn<ImageGenerator['generate']>().mockResolvedValue(base),
  };
  const renderer = {
    assertAvailable: vi.fn(),
    supports: vi.fn<TemplateRenderer['supports']>().mockReturnValue(true),
    render: vi.fn<TemplateRenderer['render']>().mockResolvedValue(composed(final)),
  };
  let assetNumber = 500;
  const storage = {
    assertAvailable: vi.fn(),
    store: vi.fn<StorageProvider['store']>().mockImplementation(async (input) => ({
      id: testId(assetNumber++),
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      generationId: input.generationId,
      purpose: input.purpose,
      width: input.source.width,
      height: input.source.height,
      contentType: input.source.contentType,
    })),
  };
  const clock = new CampaignClockFake();
  const ids = new CampaignIdsFake();
  const generations = campaignGenerationsFake(campaigns, new CampaignLookupsFake(), ids, clock);
  const images = new ImageRepositoryFake(campaigns, generations);
  const useCase = new GenerateCampaignImage(
    generations,
    copies,
    images,
    productImages,
    generator,
    renderer,
    storage,
    ids,
    clock,
  );
  const selection = { organizationId: ORG, campaignId: CAMPAIGN, generationId: GENERATION };
  return {
    ...domain,
    generations,
    ids,
    campaigns,
    copies,
    savedCopy,
    productImages,
    generator,
    renderer,
    storage,
    images,
    clock,
    useCase,
    selection,
    referenceImage,
    base,
    final,
  };
}

describe('GenerateCampaignImage', () => {
  it('requires one saved product image and never chooses from multiple references', async () => {
    for (const images of [[], [testId(601), testId(602)]]) {
      const f = fixture();
      const resources = resourcesFixture();
      resources.product.imageAssetIds = images;
      const snapshot = GenerationSnapshot.capture(
        resources,
        briefOf(f.draft.instructions, f.draft.cta, f.promotion),
      );
      f.campaigns.records.set(
        CAMPAIGN,
        f.draft.requestGeneration(GENERATION, snapshot, f.clock.now()),
      );
      await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({
        code: images.length === 0 ? 'PRODUCT_IMAGE_REQUIRED' : 'INVALID_OUTPUT',
      });
      expect(f.productImages.load).not.toHaveBeenCalled();
      expect(f.images.active).toBeNull();
    }
  });

  it('composes the frozen commercial data and records only the stored final asset for approval', async () => {
    const f = fixture();
    const content = await f.useCase.execute(f.selection);
    expect(f.productImages.load).toHaveBeenCalledWith(
      expect.objectContaining({
        ...f.selection,
        productId: f.snapshot.data.product.id,
        imageAssetId: f.snapshot.data.product.imageAssetIds[0],
      }),
    );
    expect(f.generator.generate).toHaveBeenCalledWith({
      ...f.selection,
      operationId: f.productImages.load.mock.calls[0]![0].operationId,
      referenceImage: f.referenceImage,
      headline: f.savedCopy.headline,
      brief: expect.objectContaining({ texts: expect.any(Array) }),
      styleImages: [],
      snapshot: f.snapshot.data,
    });
    expect(f.storage.store.mock.calls[0]![0].source).toBe(f.base);
    expect(f.storage.store.mock.calls[0]![0].source).not.toBe(f.referenceImage);
    expect(f.renderer.render).toHaveBeenCalledWith(
      expect.objectContaining({
        ...f.selection,
        mainImage: testId(500),
        copy: {
          headline: f.savedCopy.headline,
          subheadline: f.savedCopy.subheadline,
          caption: f.savedCopy.caption,
          cta: f.savedCopy.cta,
          hashtags: f.savedCopy.hashtags,
        },
        snapshot: f.snapshot.data,
      }),
    );
    expect(f.storage.store.mock.calls.map(([input]) => input.purpose)).toEqual([
      'BASE_IMAGE',
      'FINAL_PIECE',
    ]);
    expect(content).toMatchObject({
      headline: f.savedCopy.headline,
      caption: f.savedCopy.caption,
      cta: f.savedCopy.cta,
      hashtags: f.savedCopy.hashtags,
      generationId: GENERATION,
      revision: 1,
      assetIds: [testId(501)],
    });
    expect(f.images.results[0]!.baseAsset.id).toBe(testId(500));
    expect(f.campaigns.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.PENDING_APPROVAL);
    expect(f.campaigns.records.get(CAMPAIGN)!.approvedContentId).toBeNull();
    expect(f.copies.complete).not.toHaveBeenCalled();
  });

  it('replays completed work without generating, storing or rewriting content', async () => {
    const f = fixture();
    const first = await f.useCase.execute(f.selection);
    expect(await f.useCase.execute(f.selection)).toEqual(first);
    expect(f.productImages.load).toHaveBeenCalledTimes(1);
    expect(f.generator.generate).toHaveBeenCalledTimes(1);
    expect(f.storage.store).toHaveBeenCalledTimes(2);
    expect(f.campaigns.saveCount).toBe(1);
  });

  it('also replays an approved generation without changing its approval', async () => {
    const f = fixture();
    f.campaigns.records.set(CAMPAIGN, f.approved);
    expect(await f.useCase.execute(f.selection)).toMatchObject({
      id: f.content.id,
      generationId: f.content.generationId,
    });
    expect(f.productImages.load).not.toHaveBeenCalled();
    expect(f.generator.generate).not.toHaveBeenCalled();
    expect(f.campaigns.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.APPROVED);
  });

  it('hides foreign campaigns and performs no external operation', async () => {
    const f = fixture();
    await expect(f.useCase.execute({ ...f.selection, organizationId: OTHER_ORG })).rejects.toThrow(
      CampaignNotFoundError,
    );
    expect(f.copies.find).not.toHaveBeenCalled();
    expect(f.productImages.load).not.toHaveBeenCalled();
  });

  it('rejects an obsolete generation before using its copy', async () => {
    const f = fixture();
    await expect(
      f.useCase.execute({ ...f.selection, generationId: NEXT_GENERATION }),
    ).rejects.toThrow(StaleGenerationResultError);
    expect(f.copies.find).not.toHaveBeenCalled();
  });

  it('requires persisted copy from the current generation', async () => {
    const f = fixture();
    f.copies.find.mockResolvedValue(null);
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'COPY_REQUIRED' });
    expect(f.copies.find).toHaveBeenCalledWith(f.selection);
    expect(f.productImages.load).not.toHaveBeenCalled();
    expect(f.images.active).toBeNull();
  });

  it('rejects a stored copy with a changed CTA', async () => {
    const f = fixture();
    f.copies.find.mockResolvedValue({ ...f.savedCopy, cta: 'Otro CTA' });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(f.productImages.load).not.toHaveBeenCalled();
  });

  it.each(['productImages', 'generator', 'renderer', 'storage'] as const)(
    'checks %s availability before reserving work',
    async (port) => {
      const f = fixture();
      f[port].assertAvailable.mockImplementation(() => {
        throw new CampaignImageError('UNAVAILABLE');
      });
      await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
      expect(f.images.active).toBeNull();
      expect(f.productImages.load).not.toHaveBeenCalled();
    },
  );

  it('rejects dimensions outside the first 1080x1080 increment', async () => {
    const f = fixture();
    const resources = resourcesFixture();
    resources.template.height = 1350;
    const snapshot = GenerationSnapshot.capture(
      resources,
      briefOf(f.draft.instructions, f.draft.cta, f.promotion),
    );
    f.campaigns.records.set(
      CAMPAIGN,
      f.draft.requestGeneration(GENERATION, snapshot, f.clock.now()),
    );
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({
      code: 'UNSUPPORTED_DIMENSIONS',
    });
    expect(f.productImages.load).not.toHaveBeenCalled();
  });

  it('prevents overlapping requests from generating twice', async () => {
    const f = fixture();
    let finish!: (image: ImageArtifact) => void;
    f.generator.generate.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = f.useCase.execute(f.selection);
    await vi.waitFor(() => expect(f.generator.generate).toHaveBeenCalledTimes(1));
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'BUSY' });
    finish(f.base);
    await first;
    expect(f.generator.generate).toHaveBeenCalledTimes(1);
  });

  it.each(['productImages', 'generator', 'renderer', 'storage'] as const)(
    'leaves the campaign unapprovable after a %s failure and allows retry',
    async (port) => {
      const f = fixture();
      const failure = new CampaignImageError('UNAVAILABLE');
      if (port === 'productImages') f.productImages.load.mockRejectedValueOnce(failure);
      else if (port === 'generator') f.generator.generate.mockRejectedValueOnce(failure);
      else if (port === 'renderer') f.renderer.render.mockRejectedValueOnce(failure);
      else f.storage.store.mockRejectedValueOnce(failure);
      await expect(f.useCase.execute(f.selection)).rejects.toBe(failure);
      expect(f.campaigns.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.GENERATING);
      expect(f.campaigns.records.get(CAMPAIGN)!.candidateContent).toBeNull();
      expect(f.images.active).toBeNull();
      await expect(f.useCase.execute(f.selection)).resolves.toHaveProperty(
        'generationId',
        GENERATION,
      );
    },
  );

  it('does not create candidate content when storing the final piece fails', async () => {
    const f = fixture();
    const store = f.storage.store.getMockImplementation()!;
    f.storage.store.mockImplementation(async (input) => {
      if (input.purpose === 'FINAL_PIECE') throw new CampaignImageError('UNAVAILABLE');
      return store(input);
    });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(f.campaigns.saveCount).toBe(0);
    expect(f.images.results).toEqual([]);
  });

  it.each([
    { width: 1024 },
    { height: 0 },
    { contentType: 'image/jpeg' as const },
    { reference: '' },
  ])('rejects an invalid final render %j before storing it', async (change) => {
    const f = fixture();
    f.renderer.render.mockResolvedValue(composed({ ...f.final, ...change }));
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(f.storage.store).toHaveBeenCalledTimes(1);
    expect(f.campaigns.saveCount).toBe(0);
  });

  it('rejects an invalid base artifact before storage', async () => {
    const f = fixture();
    f.generator.generate.mockResolvedValue({ ...f.base, width: NaN });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(f.storage.store).not.toHaveBeenCalled();
    expect(f.renderer.render).not.toHaveBeenCalled();
  });

  it('rejects an invalid source photo before requesting visual AI', async () => {
    const f = fixture();
    f.productImages.load.mockResolvedValue({ ...f.referenceImage, height: 0 });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(f.generator.generate).not.toHaveBeenCalled();
    expect(f.storage.store).not.toHaveBeenCalled();
  });

  it('does not fall back to the source photo when visual AI fails', async () => {
    const f = fixture();
    f.generator.generate.mockRejectedValue(new CampaignImageError('UNAVAILABLE'));
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(f.productImages.load).toHaveBeenCalledTimes(1);
    expect(f.storage.store).not.toHaveBeenCalled();
    expect(f.renderer.render).not.toHaveBeenCalled();
    expect(f.campaigns.records.get(CAMPAIGN)!.candidateContent).toBeNull();
  });

  it('does not accept visual AI after the reservation expires', async () => {
    const f = fixture();
    f.generator.generate.mockImplementation(async () => {
      f.clock.value = new Date(f.clock.now().getTime() + 300000).toISOString();
      return f.base;
    });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(f.storage.store).not.toHaveBeenCalled();
    expect(f.renderer.render).not.toHaveBeenCalled();
    expect(f.images.active).toBeNull();
  });

  it('does not request visual AI when loading the photo consumed the reservation', async () => {
    const f = fixture();
    f.productImages.load.mockImplementation(async () => {
      f.clock.value = new Date(f.clock.now().getTime() + 300000).toISOString();
      return f.referenceImage;
    });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(f.generator.generate).not.toHaveBeenCalled();
    expect(f.storage.store).not.toHaveBeenCalled();
    expect(f.images.active).toBeNull();
  });

  it('keeps renderer copy exact even if a visual adapter changes its input', async () => {
    const f = fixture();
    f.generator.generate.mockImplementation(async (input) => {
      input.headline = 'Titular inventado';
      return f.base;
    });
    const content = await f.useCase.execute(f.selection);
    expect(f.renderer.render.mock.calls[0]![0].copy).toEqual({
      headline: f.savedCopy.headline,
      subheadline: f.savedCopy.subheadline,
      caption: f.savedCopy.caption,
      cta: f.savedCopy.cta,
      hashtags: f.savedCopy.hashtags,
    });
    expect(content.cta).toBe(f.savedCopy.cta);
    expect(content.hashtags).toEqual(f.savedCopy.hashtags);
  });

  it.each(['organizationId', 'campaignId', 'generationId'] as const)(
    'rejects stored assets with a foreign %s',
    async (field) => {
      const f = fixture();
      const store = f.storage.store.getMockImplementation()!;
      f.storage.store.mockImplementation(async (input) => ({
        ...(await store(input)),
        [field]: testId(999),
      }));
      await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({
        code: 'INVALID_OUTPUT',
      });
      expect(f.renderer.render).not.toHaveBeenCalled();
      expect(f.campaigns.saveCount).toBe(0);
    },
  );

  it('never approves the base image as the final asset', async () => {
    const f = fixture();
    const store = f.storage.store.getMockImplementation()!;
    f.storage.store.mockImplementation(async (input) => ({
      ...(await store(input)),
      id: testId(500),
    }));
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(f.campaigns.saveCount).toBe(0);
  });

  it('does not accept results after the reservation expires', async () => {
    const f = fixture();
    f.renderer.render.mockImplementation(async () => {
      f.clock.value = new Date(f.clock.now().getTime() + 300000).toISOString();
      return composed(f.final);
    });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(f.storage.store).toHaveBeenCalledTimes(1);
    expect(f.campaigns.saveCount).toBe(0);
  });

  it('reclaims an expired reservation using a different operation token', async () => {
    const f = fixture();
    f.images.active = {
      ...f.selection,
      token: testId(999),
      expectedVersion: f.generating.version,
      now: f.clock.now(),
      expiresAt: f.clock.now(),
    };
    await f.useCase.execute(f.selection);
    expect(f.productImages.load.mock.calls[0]![0].operationId).not.toBe(testId(999));
    expect(f.campaigns.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.PENDING_APPROVAL);
  });

  it('does not start provider work when reserving took longer than the lease', async () => {
    const f = fixture();
    const claim = f.images.claim.bind(f.images);
    vi.spyOn(f.images, 'claim').mockImplementation(async (lease) => {
      const accepted = await claim(lease);
      f.clock.value = lease.expiresAt.toISOString();
      return accepted;
    });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(f.productImages.load).not.toHaveBeenCalled();
  });

  it('preserves the provider error if releasing the reservation also fails', async () => {
    const f = fixture();
    const failure = new CampaignImageError('TIMEOUT');
    f.productImages.load.mockRejectedValue(failure);
    vi.spyOn(f.images, 'release').mockRejectedValue(new Error('Repository unreachable'));
    await expect(f.useCase.execute(f.selection)).rejects.toBe(failure);
    expect(f.campaigns.saveCount).toBe(0);
  });

  it('does not generate an expired promotion', async () => {
    const f = fixture();
    f.clock.value = '2026-09-21T12:00:00.000Z';
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({
      name: 'PromotionExpiredError',
    });
    expect(f.productImages.load).not.toHaveBeenCalled();
    expect(f.images.active).toBeNull();
  });

  it('does not let an old worker commit or release a newer reservation', async () => {
    const f = fixture();
    f.renderer.render.mockImplementation(async () => {
      f.images.active = { ...f.images.active!, token: testId(999) };
      return composed(f.final);
    });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'STALE_RESULT' });
    expect(f.images.active!.token).toBe(testId(999));
    expect(f.campaigns.saveCount).toBe(0);
  });

  it('does not overwrite a newer campaign generation after provider work', async () => {
    const f = fixture();
    f.renderer.render.mockImplementation(async () => {
      f.campaigns.records.set(
        CAMPAIGN,
        f.pending.requestRegeneration(NEXT_GENERATION, f.snapshot, f.clock.now()),
      );
      return composed(f.final);
    });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'STALE_RESULT' });
    expect(f.campaigns.records.get(CAMPAIGN)!.generation!.id).toBe(NEXT_GENERATION);
    expect(f.campaigns.saveCount).toBe(0);
  });

  it('recovers an ambiguous commit by returning the persisted content on retry', async () => {
    const f = fixture();
    const complete = f.images.complete.bind(f.images);
    vi.spyOn(f.images, 'complete').mockImplementationOnce(async (...args) => {
      await complete(...args);
      throw new Error('Connection lost after commit');
    });
    await expect(f.useCase.execute(f.selection)).rejects.toThrow('Connection lost after commit');
    const content = await f.useCase.execute(f.selection);
    expect(content.id).toBe(f.campaigns.records.get(CAMPAIGN)!.candidateContent!.id);
    expect(f.productImages.load).toHaveBeenCalledTimes(1);
  });
});

describe('GenerateCampaignImage in AI_FULL', () => {
  const LOGO = testId(950);
  const logoArtifact: ImageArtifact = {
    reference: 'test:logo',
    contentType: 'image/png',
    width: 200,
    height: 100,
  };
  const area: ImageArtifact = {
    reference: 'test:area',
    contentType: 'image/png',
    width: 120,
    height: 60,
  };

  // Lo que leería la visión en un flyer correcto del fixture.
  function reading(price = 'Ahora S/ 15.00'): FlyerReading {
    return {
      texts: [
        { text: 'Producto', kind: 'headline' },
        { text: 'Prod', kind: 'product_name' },
        { text: 'Antes S/ 20.00', kind: 'regular_price' },
        { text: price, kind: 'promotion_price' },
        { text: 'Hasta el 19 de setiembre', kind: 'validity' },
        { text: 'Comprar ahora', kind: 'cta' },
      ],
      logo: { visible: true, text: 'Logo' },
    };
  }

  function aiFull(withLogo = false) {
    const f = fixture();
    if (withLogo) {
      const resources = resourcesFixture();
      resources.organization.logoAssetId = LOGO;
      resources.organization.logoIsDark = true;
      const snapshot = GenerationSnapshot.capture(
        resources,
        briefOf(f.draft.instructions, f.draft.cta, f.promotion),
      );
      f.campaigns.records.set(
        CAMPAIGN,
        f.draft.requestGeneration(GENERATION, snapshot, f.clock.now()),
      );
      f.copies.find.mockResolvedValue({ ...f.savedCopy, cta: snapshot.data.cta });
      f.renderer.render.mockResolvedValue({
        final: f.final,
        areaUnderLogo: area,
        logoPlacement: 'DIRECT',
      });
    }
    const logos = {
      assertAvailable: vi.fn(),
      load: vi.fn<FlyerLogoSource['load']>().mockResolvedValue(logoArtifact),
    };
    const reader = {
      assertAvailable: vi.fn(),
      read: vi.fn<FlyerReader['read']>().mockResolvedValue(reading()),
      reviewLogoArea: vi.fn<FlyerReader['reviewLogoArea']>().mockResolvedValue({
        hasText: false,
        text: '',
        hasObject: false,
        object: '',
      }),
    };
    const report = vi.fn();
    const temporary = { discard: vi.fn(async () => undefined) };
    const useCase = new GenerateCampaignImage(
      f.generations,
      f.copies,
      f.images,
      f.productImages,
      f.generator,
      f.renderer,
      f.storage,
      f.ids,
      f.clock,
      { logos, reader, report, temporary },
    );
    return { ...f, logos, reader, report, temporary, useCase };
  }

  it('verifies the final flyer against the brief before recording it', async () => {
    const f = aiFull();
    const content = await f.useCase.execute(f.selection);
    expect(content.assetIds).toHaveLength(1);
    // El subtítulo revisado queda en el contenido que se aprueba.
    expect(content.subheadline).toBe(f.savedCopy.subheadline);
    // Sin logo en el snapshot no se carga ni se revisa ninguna esquina.
    expect(f.logos.load).not.toHaveBeenCalled();
    expect(f.reader.reviewLogoArea).not.toHaveBeenCalled();
    expect(f.reader.read).toHaveBeenCalledWith(expect.objectContaining({ image: f.final }));
    expect(f.report).toHaveBeenCalledWith(
      expect.objectContaining({ verification: expect.objectContaining({ ok: true }) }),
    );
    expect(f.campaigns.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.PENDING_APPROVAL);
    // Los temporales de la operación se borran al terminar.
    expect(f.temporary.discard).toHaveBeenCalledWith(
      expect.objectContaining({ ...f.selection, operationId: expect.any(String) }),
    );
  });

  it('fails with VERIFICATION_FAILED and stores no final flyer when a price is wrong', async () => {
    const f = aiFull();
    f.reader.read.mockResolvedValue(reading('Ahora S/ 51.00'));
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({
      code: 'VERIFICATION_FAILED',
    });
    expect(f.storage.store.mock.calls.map(([input]) => input.purpose)).toEqual(['BASE_IMAGE']);
    expect(f.images.active).toBeNull();
    expect(f.campaigns.saveCount).toBe(0);
    // También tras un fallo.
    expect(f.temporary.discard).toHaveBeenCalledOnce();
  });

  it('pastes the frozen logo and fails if the AI drew text under it', async () => {
    const f = aiFull(true);
    f.reader.reviewLogoArea.mockResolvedValue({
      hasText: true,
      text: 'Nuevo',
      hasObject: false,
      object: '',
    });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({
      code: 'VERIFICATION_FAILED',
    });
    expect(f.logos.load).toHaveBeenCalledWith(expect.objectContaining({ assetId: LOGO }));
    const brief = f.generator.generate.mock.calls[0]![0].brief;
    expect(brief.logo).toMatchObject({ isDark: true, aspectRatio: 2 });
    expect(f.renderer.render).toHaveBeenCalledWith(
      expect.objectContaining({ logo: logoArtifact, brief }),
    );
    expect(f.reader.reviewLogoArea).toHaveBeenCalledWith(expect.objectContaining({ image: area }));
  });

  it('sends the frozen style references of the template to the generator', async () => {
    const f = aiFull();
    const STYLE = testId(960);
    const resources = resourcesFixture();
    resources.template.design = { ...DEFAULT_FLYER_DESIGN, styleReferenceAssetIds: [STYLE] };
    const snapshot = GenerationSnapshot.capture(
      resources,
      briefOf(f.draft.instructions, f.draft.cta, f.promotion),
    );
    f.campaigns.records.set(
      CAMPAIGN,
      f.draft.requestGeneration(GENERATION, snapshot, f.clock.now()),
    );
    const style: ImageArtifact = {
      reference: 'test:style',
      contentType: 'image/png',
      width: 600,
      height: 600,
    };
    const styles = { load: vi.fn<FlyerStyleSource['load']>().mockResolvedValue(style) };
    const useCase = new GenerateCampaignImage(
      f.generations,
      f.copies,
      f.images,
      f.productImages,
      f.generator,
      f.renderer,
      f.storage,
      f.ids,
      f.clock,
      { logos: f.logos, reader: f.reader, styles },
    );
    await useCase.execute(f.selection);
    expect(styles.load).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: snapshot.data.template.id, assetId: STYLE }),
    );
    const input = f.generator.generate.mock.calls[0]![0];
    expect(input.styleImages).toEqual([style]);
    expect(input.brief.styleReferences).toBe(1);
  });

  it('refuses a format the compositor cannot produce before reserving work', async () => {
    const f = aiFull();
    f.renderer.supports.mockReturnValue(false);
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({
      code: 'UNSUPPORTED_DIMENSIONS',
    });
    expect(f.images.active).toBeNull();
    expect(f.generator.generate).not.toHaveBeenCalled();
  });
});
