import { mkdtemp, readdir, rm, utimes } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { CAMPAIGN, GENERATION, ORG, testId } from '../../../support/campaign-fakes.js';
import { LocalImageArtifacts } from '#app/modules/content-generation/infrastructure/local-image-artifacts';

const scope = (operation: number) => ({
  organizationId: ORG,
  campaignId: CAMPAIGN,
  generationId: GENERATION,
  operationId: testId(operation),
});

describe('LocalImageArtifacts cleanup', () => {
  let directory: string;
  let artifacts: LocalImageArtifacts;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'creovexa-artifacts-'));
    artifacts = new LocalImageArtifacts(directory);
  });
  afterEach(async () => {
    if (resolve(directory).startsWith(resolve(tmpdir()) + sep + 'creovexa-artifacts-'))
      await rm(directory, { recursive: true });
  });

  const operations = () => readdir(join(directory, ORG, CAMPAIGN, GENERATION));

  it('discards only the files of the finished operation', async () => {
    await artifacts.write(scope(901), Buffer.from('a'));
    await artifacts.write(scope(902), Buffer.from('b'));
    await artifacts.discard(scope(901));
    expect(await operations()).toEqual([testId(902)]);
    // Descartar dos veces no falla.
    await expect(artifacts.discard(scope(901))).resolves.toBeUndefined();
  });

  it('sweeps operation folders older than the limit', async () => {
    await artifacts.write(scope(903), Buffer.from('a'));
    await artifacts.write(scope(904), Buffer.from('b'));
    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await utimes(join(directory, ORG, CAMPAIGN, GENERATION, testId(903)), old, old);
    await artifacts.sweep(24 * 60 * 60 * 1000);
    expect(await operations()).toEqual([testId(904)]);
  });

  it('does nothing when the folder does not exist yet', async () => {
    await expect(
      new LocalImageArtifacts(join(directory, 'missing')).sweep(1),
    ).resolves.toBeUndefined();
  });
});
