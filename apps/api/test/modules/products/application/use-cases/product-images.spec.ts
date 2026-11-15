import { entityId } from '#app/domain/entity-id';
import { Product } from '#app/modules/products/domain/entities/product';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { Money } from '#app/domain/value-objects/money';
import type { ProductRepository } from '#app/modules/products/domain/repositories/product.repository';
import type { ProductImages } from '#app/modules/products/application/ports/product-images';
import { SaveProductImage } from '#app/modules/products/application/use-cases/save-product-image';
import { GetProductImage } from '#app/modules/products/application/use-cases/get-product-image';

const org = entityId('11111111-1111-4111-8111-111111111111');
const id = entityId('22222222-2222-4222-8222-222222222222');
const asset = entityId('33333333-3333-4333-8333-333333333333');
const at = new Date('2026-10-01T10:00:00Z');
function fixture() {
  let product: Product | null = Product.create(
    id,
    org,
    ProductKind.PRODUCT,
    { name: 'Mouse', regularPrice: Money.fromMinorUnits(10000, 'PEN') },
    at,
  );
  const repo = {
    setArchivedAt: vi.fn(),
    findById: vi.fn<ProductRepository['findById']>().mockImplementation(async () => product),
    add: vi.fn(),
    save: vi.fn(),
    list: vi.fn(),
  } satisfies ProductRepository;
  const images = {
    assertAvailable: vi.fn(),
    read: vi.fn<ProductImages['read']>().mockResolvedValue(null),
    save: vi.fn<ProductImages['save']>().mockImplementation(async (input) => {
      product = product!.updateDetails({ imageAssetIds: [input.assetId] }, input.at);
    }),
  } satisfies ProductImages;
  const save = new SaveProductImage(repo, images, { next: () => asset }, { now: () => at });
  return { repo, images, save };
}
describe('Product image use cases', () => {
  it('replaces one image and returns the persisted product', async () => {
    const f = fixture();
    const result = await f.save.execute({
      organizationId: org,
      productId: id,
      bytes: new Uint8Array([1]),
      photoType: 'CUTOUT',
    });
    expect(result.imageAssetIds).toEqual([asset]);
    expect(f.images.save).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: org,
        productId: id,
        assetId: asset,
        photoType: 'CUTOUT',
        expectedUpdatedAt: at,
      }),
    );
    expect(new Date(result.updatedAt).getTime()).toBe(at.getTime() + 1);
  });
  it.each([undefined, '', 'ESTUDIO'])(
    'requires a valid photo type (%j) before storing',
    async (photoType) => {
      const f = fixture();
      await expect(
        f.save.execute({
          organizationId: org,
          productId: id,
          bytes: new Uint8Array([1]),
          photoType: photoType as string,
        }),
      ).rejects.toMatchObject({ name: 'InvalidProductError', field: 'photoType' });
      expect(f.images.save).not.toHaveBeenCalled();
    },
  );
  it('checks the owner before contacting storage', async () => {
    const f = fixture();
    f.repo.findById.mockResolvedValue(null);
    await expect(
      f.save.execute({
        organizationId: org,
        productId: id,
        bytes: new Uint8Array([1]),
        photoType: 'STUDIO',
      }),
    ).rejects.toMatchObject({ name: 'ProductNotFoundError' });
    expect(f.images.save).not.toHaveBeenCalled();
  });
  it('rejects empty and excessive uploads before storing', async () => {
    const f = fixture();
    for (const bytes of [new Uint8Array(), new Uint8Array(10 * 1024 * 1024 + 1)])
      await expect(
        f.save.execute({ organizationId: org, productId: id, bytes, photoType: 'STUDIO' }),
      ).rejects.toMatchObject({ code: bytes.length ? 'TOO_LARGE' : 'INVALID_IMAGE' });
    expect(f.images.save).not.toHaveBeenCalled();
  });
  it('refuses a repository result from another organization before uploading', async () => {
    const f = fixture();
    f.repo.findById.mockResolvedValue(
      Product.create(
        id,
        asset,
        ProductKind.PRODUCT,
        { name: 'Ajeno', regularPrice: Money.fromMinorUnits(10000, 'PEN') },
        at,
      ),
    );
    await expect(
      f.save.execute({
        organizationId: org,
        productId: id,
        bytes: new Uint8Array([1]),
        photoType: 'STUDIO',
      }),
    ).rejects.toMatchObject({ name: 'ProductNotFoundError' });
    expect(f.images.save).not.toHaveBeenCalled();
  });
  it('does not report success or change the product when storage fails', async () => {
    const f = fixture();
    f.images.save.mockRejectedValue(new Error('Unavailable'));
    await expect(
      f.save.execute({
        organizationId: org,
        productId: id,
        bytes: new Uint8Array([1]),
        photoType: 'STUDIO',
      }),
    ).rejects.toThrow('Unavailable');
    expect((await f.repo.findById(org, id))?.imageAssetIds).toEqual([]);
  });
  it('reads only with owner, product and asset selection', async () => {
    const f = fixture();
    const get = new GetProductImage(f.images);
    await expect(
      get.execute({ organizationId: org, productId: id, assetId: asset }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(f.images.read).toHaveBeenCalledWith({
      organizationId: org,
      productId: id,
      assetId: asset,
    });
  });
});
