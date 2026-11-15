import { z } from 'zod';
import { amountMinor } from './product-price';
export const productSchema = z.object({
  kind: z.enum(['PRODUCT', 'SERVICE']),
  name: z.string().trim().min(1, 'Ingresa un nombre').max(200, 'Máximo 200 caracteres'),
  description: z.string().trim().max(5000, 'Máximo 5000 caracteres'),
  price: z
    .string()
    .refine(
      (value) => amountMinor(value) !== null,
      'Ingresa un precio válido con hasta dos decimales',
    ),
  currency: z.enum(['PEN', 'USD', 'EUR']),
  shortName: z.string().trim().max(40, 'Máximo 40 caracteres'),
  productBrand: z.string().trim().max(80, 'Máximo 80 caracteres'),
  // Una característica por línea.
  keyAttributes: z
    .string()
    .refine((value) => lines(value).length <= 5, 'Máximo 5 características')
    .refine(
      (value) => lines(value).every((line) => line.length <= 60),
      'Máximo 60 caracteres por línea',
    )
    .refine(
      (value) =>
        new Set(lines(value).map((line) => line.toLocaleLowerCase('es'))).size ===
        lines(value).length,
      'Hay características repetidas',
    ),
  unit: z.string().trim().max(30, 'Máximo 30 caracteres'),
  // Obligatorio al subir una foto; el formulario lo exige solo si hay imagen nueva.
  photoType: z.enum(['', 'CUTOUT', 'STUDIO', 'SCENE', 'PLACE', 'PERSON']),
});
const lines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
export type ProductFormValues = z.infer<typeof productSchema>;
export function productInput(values: ProductFormValues) {
  const validated = productSchema.parse(values);
  return {
    kind: validated.kind,
    name: validated.name,
    description: validated.description,
    regularPrice: { amountMinor: amountMinor(validated.price)!, currency: validated.currency },
    shortName: validated.shortName || null,
    productBrand: validated.productBrand || null,
    keyAttributes: lines(validated.keyAttributes),
    unit: validated.unit || null,
  };
}
/** Lo editable de un producto ya creado: todo menos el tipo, que no cambia. */
export function productChanges(values: ProductFormValues) {
  const { name, description, regularPrice, shortName, productBrand, keyAttributes, unit } =
    productInput(values);
  return { name, description, regularPrice, shortName, productBrand, keyAttributes, unit };
}
