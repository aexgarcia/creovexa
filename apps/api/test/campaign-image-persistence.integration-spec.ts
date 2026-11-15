import { ImagePersistenceContext, uuid } from './support/image-persistence-context.js';

describe('Image reservations and completion (PostgreSQL)', () => {
  const context = new ImagePersistenceContext();
  beforeAll(() => context.init());
  afterAll(() => context.close());

  it('allows exactly one concurrent claimant', async () => {
    const { lease } = await context.fixture();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => context.images.claim({ ...lease, token: uuid() })),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('requires persisted copy and rejects foreign owners, versions and generations', async () => {
    const { lease } = await context.fixture(false);
    await expect(context.images.claim(lease)).rejects.toMatchObject({ code: 'COPY_REQUIRED' });
    for (const invalid of [
      { organizationId: uuid() },
      { generationId: uuid() },
      { expectedVersion: lease.expectedVersion + 1 },
    ])
      await expect(context.images.claim({ ...lease, ...invalid })).rejects.toMatchObject({
        code: 'STALE_RESULT',
      });
  });

  it('uses database time, not a stale caller timestamp, to reject expiration', async () => {
    const { lease } = await context.fixture();
    await expect(
      context.images.claim({ ...lease, now: new Date(0), expiresAt: new Date(1000) }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('reclaims an expired lease, fences the old worker and ignores its release', async () => {
    const f = await context.fixture();
    await context.images.claim(f.lease);
    const base = await context.stored(f.lease, 'BASE_IMAGE');
    const final = await context.stored(f.lease, 'FINAL_PIECE');
    await context.database.campaignImageJob.update({
      where: { generationId: f.lease.generationId },
      data: { expiresAt: new Date(0) },
    });
    const replacement = { ...f.lease, token: uuid() };
    expect(await context.images.claim(replacement)).toBe(true);
    await expect(
      context.images.complete(f.lease, f.completion(base, final), new Date()),
    ).rejects.toMatchObject({ code: 'STALE_RESULT' });
    await context.images.release(f.lease);
    expect(
      await context.database.campaignImageJob.findUnique({
        where: { generationId: f.lease.generationId },
      }),
    ).toMatchObject({ token: replacement.token, status: 'RUNNING' });
    expect(
      await context.database.generatedContent.count({
        where: { generationId: f.lease.generationId },
      }),
    ).toBe(0);
  });

  it('commits content, campaign and reservation together and preserves completed work on release', async () => {
    const f = await context.fixture();
    await context.images.claim(f.lease);
    const base = await context.stored(f.lease, 'BASE_IMAGE');
    const final = await context.stored(f.lease, 'FINAL_PIECE');
    await context.images.complete(f.lease, f.completion(base, final), new Date());
    await context.images.release(f.lease);
    const campaign = await context.campaigns.findById(f.lease.organizationId, f.lease.campaignId);
    expect(campaign?.status).toBe('PENDING_APPROVAL');
    expect(campaign?.candidateContent?.assetIds).toEqual([final.id]);
    expect(
      await context.database.campaignImageJob.findUnique({
        where: { generationId: f.lease.generationId },
      }),
    ).toMatchObject({ status: 'READY' });
    await expect(
      context.images.complete(f.lease, f.completion(base, final), new Date()),
    ).rejects.toMatchObject({ code: 'STALE_RESULT' });
    expect(
      await context.database.generatedContent.count({
        where: { generationId: f.lease.generationId },
      }),
    ).toBe(1);
  });

  it('rejects unregistered and foreign assets without changing the campaign', async () => {
    const f = await context.fixture();
    await context.images.claim(f.lease);
    const base = await context.stored(f.lease, 'BASE_IMAGE');
    const other = await context.fixture();
    const foreign = await context.stored(other.lease, 'FINAL_PIECE');
    for (const final of [foreign, { ...base, id: uuid(), purpose: 'FINAL_PIECE' as const }])
      await expect(
        context.images.complete(f.lease, f.completion(base, final), new Date()),
      ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(
      (await context.campaigns.findById(f.lease.organizationId, f.lease.campaignId))?.status,
    ).toBe('GENERATING');
  });

  it('rejects expired completion even when the caller supplies an earlier timestamp', async () => {
    const f = await context.fixture();
    await context.images.claim(f.lease);
    const base = await context.stored(f.lease, 'BASE_IMAGE');
    const final = await context.stored(f.lease, 'FINAL_PIECE');
    await context.database.campaignImageJob.update({
      where: { generationId: f.lease.generationId },
      data: { expiresAt: new Date(0) },
    });
    await expect(
      context.images.complete(f.lease, f.completion(base, final), f.lease.now),
    ).rejects.toMatchObject({ code: 'STALE_RESULT' });
  });

  it('does not commit modified copy', async () => {
    const f = await context.fixture();
    await context.images.claim(f.lease);
    const base = await context.stored(f.lease, 'BASE_IMAGE');
    const final = await context.stored(f.lease, 'FINAL_PIECE');
    const completion = f.completion(base, final);
    await context.database.campaignCopy.update({
      where: { generationId: f.lease.generationId },
      data: { content: { ...f.copy, caption: 'Otro texto' } },
    });
    await expect(context.images.complete(f.lease, completion, new Date())).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
    });
    expect(
      await context.database.generatedContent.count({
        where: { generationId: f.lease.generationId },
      }),
    ).toBe(0);
  });
});
