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
});
export type ProductFormValues = z.infer<typeof productSchema>;
export function productInput(values: ProductFormValues) {
  const validated = productSchema.parse(values);
  return {
    kind: validated.kind,
    name: validated.name,
    description: validated.description,
    regularPrice: { amountMinor: amountMinor(validated.price)!, currency: validated.currency },
  };
}
