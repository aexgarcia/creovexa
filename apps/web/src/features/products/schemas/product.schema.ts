import { z } from 'zod';
import { amountMinor } from './product-price';
// Lista guardada como un texto por línea: hasta max, sin repetidos.
function lineList(max: number, length: number, noun: string) {
  return z
    .string()
    .refine((value) => lines(value).length <= max, `Máximo ${max} ${noun}`)
    .refine(
      (value) => lines(value).every((line) => line.length <= length),
      `Máximo ${length} caracteres por línea`,
    )
    .refine(
      (value) =>
        new Set(lines(value).map((line) => line.toLocaleLowerCase('es'))).size ===
        lines(value).length,
      `Hay ${noun} repetidos`,
    );
}
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
  keyAttributes: lineList(5, 60, 'características'),
  unit: z.string().trim().max(30, 'Máximo 30 caracteres'),
  // Datos de venta para el copy (ADR-0029); un beneficio por línea.
  benefits: lineList(5, 120, 'beneficios'),
  idealFor: z.string().trim().max(200, 'Máximo 200 caracteres'),
  // Obligatorio al subir una foto; el formulario lo exige solo si hay imagen nueva.
  photoType: z.enum(['', 'CUTOUT', 'STUDIO', 'SCENE', 'PLACE', 'PERSON']),
});
const lines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
export type ProductFormValues = z.infer<typeof productSchema>;
/** Lo editable de un producto ya creado: todo menos el tipo, que no cambia. */
export function productChanges(values: ProductFormValues) {
  const validated = productSchema.parse(values);
  return {
    name: validated.name,
    description: validated.description,
    regularPrice: { amountMinor: amountMinor(validated.price)!, currency: validated.currency },
    shortName: validated.shortName || null,
    productBrand: validated.productBrand || null,
    keyAttributes: lines(validated.keyAttributes),
    unit: validated.unit || null,
    benefits: lines(validated.benefits),
    idealFor: validated.idealFor || null,
  };
}
export function productInput(values: ProductFormValues) {
  return { kind: values.kind, ...productChanges(values) };
}
