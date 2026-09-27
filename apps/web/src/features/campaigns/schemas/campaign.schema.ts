import { z } from 'zod';

export const campaignSchema = z
  .object({
    name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(120, 'El nombre es demasiado largo'),

    productId: z.string().min(1, 'Selecciona un producto'),

    templateId: z.string().min(1, 'Selecciona una plantilla'),

    promotionStart: z.string().optional(),

    promotionEnd: z.string().optional(),

    additionalInstructions: z
      .string()
      .max(1000, 'Las instrucciones son demasiado largas')
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.promotionStart || !data.promotionEnd) {
        return true;
      }

      return new Date(data.promotionEnd) >= new Date(data.promotionStart);
    },
    {
      message: 'La fecha final no puede ser anterior a la fecha inicial',
      path: ['promotionEnd'],
    },
  );

export type CampaignFormValues = z.infer<typeof campaignSchema>;
