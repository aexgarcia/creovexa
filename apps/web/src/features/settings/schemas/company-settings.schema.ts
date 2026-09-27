import { z } from 'zod';

export const companySettingsSchema = z.object({
  businessName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre es demasiado largo'),

  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(1000, 'La descripción es demasiado larga'),

  logoUrl: z.string().url('Ingresa una URL válida').optional().or(z.literal('')),

  brandTone: z.enum(['PROFESSIONAL', 'FRIENDLY', 'MODERN', 'ENERGETIC', 'ELEGANT']),

  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ingresa un color hexadecimal válido'),

  defaultCta: z.string().min(2, 'El CTA es demasiado corto').max(80, 'El CTA es demasiado largo'),
});

export type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;
