export type Currency = 'PEN' | 'USD' | 'EUR';
export type ProductKind = 'PRODUCT' | 'SERVICE';
export interface Product {
  id: string;
  organizationId: string;
  kind: ProductKind;
  name: string;
  description: string;
  regularPrice: { amountMinor: number; currency: Currency };
  imageAssetIds: string[];
  /** URL que resuelve la API para la única imagen guardada. */
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateProductInput {
  kind: ProductKind;
  name: string;
  description: string;
  regularPrice: Product['regularPrice'];
}
export type UpdateProductInput = Omit<CreateProductInput, 'kind'>;
