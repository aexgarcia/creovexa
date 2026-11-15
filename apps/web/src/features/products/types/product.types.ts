export type Currency = 'PEN' | 'USD' | 'EUR';
export type ProductKind = 'PRODUCT' | 'SERVICE';
// Qué muestra la foto; lo indica quien la sube.
export type PhotoType = 'CUTOUT' | 'STUDIO' | 'SCENE' | 'PLACE' | 'PERSON';
export interface Product {
  id: string;
  organizationId: string;
  kind: ProductKind;
  name: string;
  description: string;
  regularPrice: { amountMinor: number; currency: Currency };
  // El nombre para el flyer; sin él se usa el completo.
  shortName: string | null;
  productBrand: string | null;
  keyAttributes: string[];
  unit: string | null;
  imageAssetIds: string[];
  // null sin imagen; photoType es null en imágenes subidas antes de que se pidiera.
  image: { photoType: PhotoType | null; hasTransparency: boolean | null } | null;
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
  shortName: string | null;
  productBrand: string | null;
  keyAttributes: string[];
  unit: string | null;
}
export type UpdateProductInput = Omit<CreateProductInput, 'kind'>;
