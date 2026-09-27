import { z } from 'zod';

export const templateSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre es demasiado largo'),

  description: z
    .string()
    .min(5, 'La descripción debe tener al menos 5 caracteres')
    .max(500, 'La descripción es demasiado larga'),

  format: z.enum(['SQUARE', 'PORTRAIT', 'STORY']),

  isActive: z.boolean(),

  settings: z.object({
    showLogo: z.boolean(),

    showRegularPrice: z.boolean(),

    showPromotionPrice: z.boolean(),

    showHeadline: z.boolean(),

    showCta: z.boolean(),

    showMainImage: z.boolean(),
  }),
});

export type TemplateFormValues = z.infer<typeof templateSchema>;
