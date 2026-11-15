import { createHash } from 'node:crypto';
import { StoredCampaignAssets } from '#app/modules/campaigns/infrastructure/stored-campaign-assets';
import { CampaignAssetError } from '#app/modules/campaigns/application/errors/campaign-asset.error';
import {
  ObjectStorageError,
  type ObjectStorage,
} from '#app/modules/assets/application/ports/object-storage';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { ORG, CAMPAIGN, GENERATION, ASSET } from '../../../support/campaign-fakes.js';

function fixture() {
  const bytes = Buffer.from('archivo de prueba');
  const row = {
    id: ASSET,
    organizationId: ORG,
    campaignId: CAMPAIGN,
    generationId: GENERATION,
    purpose: 'FINAL_PIECE',
    contentType: 'image/png',
    width: 1080,
    height: 1080,
    bucket: 'pruebas',
    objectKey: 'privado',
    byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  const findFirst = vi.fn().mockResolvedValue(row);
  const storage = {
    bucket: 'pruebas',
    read: vi.fn().mockResolvedValue(bytes),
    putIfAbsent: vi.fn(),
  } satisfies ObjectStorage;
  const reader = new StoredCampaignAssets(
    { campaignAsset: { findFirst } } as unknown as PrismaClient,
    storage,
  );
  return { reader, storage, findFirst, row };
}
const selection = {
  organizationId: ORG,
  campaignId: CAMPAIGN,
  generationId: GENERATION,
  assetId: ASSET,
};

describe('Lectura del flyer persistido', () => {
  it('no consulta storage cuando no hay un asset propio de la campaña y generación', async () => {
    const f = fixture();
    f.findFirst.mockResolvedValue(null);
    expect(await f.reader.readFinal(selection)).toBeNull();
    expect(f.storage.read).not.toHaveBeenCalled();
    expect(f.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: selection.assetId,
        organizationId: selection.organizationId,
        campaignId: selection.campaignId,
        generationId: selection.generationId,
      }),
    });
  });
  it.each([
    ['UNAVAILABLE', 'UNAVAILABLE'],
    ['TIMEOUT', 'TIMEOUT'],
    ['EMPTY', 'CORRUPTED'],
    ['TOO_LARGE', 'CORRUPTED'],
  ] as const)(
    'traduce el fallo de storage %s a un error de lectura %s',
    async (failure, expected) => {
      const f = fixture();
      f.storage.read.mockRejectedValue(new ObjectStorageError(failure));
      await expect(f.reader.readFinal(selection)).rejects.toMatchObject({
        name: 'CampaignAssetError',
        code: expected,
      });
    },
  );
  it('detecta bytes modificados aunque mantengan el mismo tamaño', async () => {
    const f = fixture();
    f.storage.read.mockResolvedValue(Buffer.alloc(f.row.byteLength));
    await expect(f.reader.readFinal(selection)).rejects.toMatchObject({
      name: 'CampaignAssetError',
      code: 'CORRUPTED',
    });
  });
  it('rechaza bytes ilegibles incluso con hash y longitud coincidentes', async () => {
    const f = fixture();
    await expect(f.reader.readFinal(selection)).rejects.toBeInstanceOf(CampaignAssetError);
    await expect(f.reader.readFinal(selection)).rejects.toMatchObject({ code: 'CORRUPTED' });
  });
  it('no expone el detalle de una excepción inesperada de storage', async () => {
    const f = fixture();
    f.storage.read.mockRejectedValue(new Error('detalle privado de infraestructura'));
    await expect(f.reader.readFinal(selection)).rejects.toMatchObject({
      name: 'CampaignAssetError',
      code: 'UNAVAILABLE',
    });
  });
});
