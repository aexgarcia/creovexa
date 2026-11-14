import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateProductRequest,
  UpdateProductRequest,
} from '#app/modules/products/presentation/product.requests';

const image = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
describe('Single product image HTTP input', () => {
  it('rejects multiple images on create and update', async () => {
    const create = plainToInstance(CreateProductRequest, {
      name: 'Mouse',
      kind: 'PRODUCT',
      regularPrice: { amountMinor: 10000, currency: 'PEN' },
      imageAssetIds: [image, other],
    });
    const update = plainToInstance(UpdateProductRequest, { imageAssetIds: [image, other] });
    for (const input of [create, update]) {
      const errors = await validate(input);
      expect(
        errors.find((error) => error.property === 'imageAssetIds')?.constraints,
      ).toHaveProperty('arrayMaxSize');
    }
  });
  it('allows replacing or clearing the single image', async () => {
    for (const imageAssetIds of [[image], []]) {
      expect(await validate(plainToInstance(UpdateProductRequest, { imageAssetIds }))).toEqual([]);
    }
  });
});
