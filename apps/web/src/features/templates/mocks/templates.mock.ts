import type { MarketingTemplate } from '../types/template.types';

export const templatesMock: MarketingTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Oferta moderna',
    description: 'Diseño limpio orientado a promociones y descuentos.',
    format: 'SQUARE',
    width: 1080,
    height: 1080,
    thumbnailUrl: null,
    isActive: true,

    settings: {
      showLogo: true,
      showRegularPrice: true,
      showPromotionPrice: true,
      showHeadline: true,
      showCta: true,
      showMainImage: true,
    },

    createdAt: '2026-09-20T10:00:00',
    updatedAt: '2026-09-22T15:30:00',
  },

  {
    id: 'tpl-002',
    name: 'Producto destacado',
    description: 'Plantilla centrada en mostrar un producto principal y precio promocional.',
    format: 'SQUARE',
    width: 1080,
    height: 1080,
    thumbnailUrl: null,
    isActive: true,

    settings: {
      showLogo: true,
      showRegularPrice: false,
      showPromotionPrice: true,
      showHeadline: true,
      showCta: true,
      showMainImage: true,
    },

    createdAt: '2026-09-18T12:00:00',
    updatedAt: '2026-09-21T17:20:00',
  },
];
