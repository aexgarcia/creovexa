import type { Campaign } from '../types/campaign.types';

export const campaignsMock: Campaign[] = [
  {
    id: 'cmp-001',

    name: 'Promo Primavera',

    productId: 'prd-001',
    productName: 'Plan Premium',
    productImageUrl: '/mock/plan-premium.png',

    templateId: 'tpl-001',
    templateName: 'Oferta moderna',

    status: 'PENDING_APPROVAL',

    promotionStart: '2026-09-20',
    promotionEnd: '2026-09-30',

    additionalInstructions: 'Destacar el descuento y utilizar un tono moderno.',

    generatedContent: {
      headline: 'Potencia tu negocio esta primavera',

      caption: 'Aprovecha nuestra promoción especial y lleva tu negocio al siguiente nivel.',

      cta: 'Conoce más',

      hashtags: ['#Promoción', '#Primavera', '#Creovexa'],

      // MOCK TEMPORAL:
      // en backend real esta URL será el flyer renderizado,
      // no la imagen original del producto.
      finalAssetUrl: '/mock/plan-premium.png',
    },

    generatedContentStatus: 'CURRENT',

    publications: [],

    createdAt: '2026-09-20T10:00:00',
    updatedAt: '2026-09-22T16:30:00',
  },

  {
    id: 'cmp-002',

    name: 'Oferta Fin de Semana',

    productId: 'prd-002',
    productName: 'Pack Empresarial',
    productImageUrl: null,

    templateId: 'tpl-002',
    templateName: 'Producto destacado',

    status: 'PUBLISHED',

    promotionStart: '2026-09-21',
    promotionEnd: '2026-09-24',

    additionalInstructions: 'Destacar el descuento y utilizar un tono moderno.',

    generatedContent: {
      headline: 'Potencia tu negocio hoy',

      caption: 'Aprovecha nuestra promoción especial por tiempo limitado.',

      cta: 'Conoce más',

      hashtags: ['#Promoción', '#Oferta', '#Creovexa'],

      finalAssetUrl: null,
    },

    generatedContentStatus: 'CURRENT',

    publications: [
      {
        id: 'pub-001',

        platform: 'FACEBOOK',

        status: 'PUBLISHED',

        externalPublicationId: 'fb-123',

        externalUrl: null,

        failureReason: null,
      },

      {
        id: 'pub-002',

        platform: 'INSTAGRAM',

        status: 'PUBLISHED',

        externalPublicationId: 'ig-123',

        externalUrl: null,

        failureReason: null,
      },
    ],

    createdAt: '2026-09-18T12:00:00',
    updatedAt: '2026-09-22T18:20:00',
  },

  {
    id: 'cmp-003',

    name: 'Lanzamiento Producto',

    productId: 'prd-004',
    productName: 'Servicio Social Ads',
    productImageUrl: null,

    templateId: 'tpl-004',
    templateName: 'Campaña elegante',

    status: 'APPROVED',

    promotionStart: null,
    promotionEnd: null,

    additionalInstructions: null,

    generatedContent: {
      headline: 'Haz crecer tu presencia digital',

      caption: 'Impulsa tus redes sociales con una estrategia diseñada para tu negocio.',

      cta: 'Empieza ahora',

      hashtags: ['#SocialAds', '#MarketingDigital', '#Creovexa'],

      finalAssetUrl: null,
    },

    generatedContentStatus: 'CURRENT',

    publications: [],

    createdAt: '2026-09-17T09:30:00',
    updatedAt: '2026-09-22T14:10:00',
  },

  {
    id: 'cmp-004',

    name: 'Campaña Octubre',

    productId: 'prd-003',
    productName: 'Plan Básico',
    productImageUrl: null,

    templateId: 'tpl-001',
    templateName: 'Oferta moderna',

    status: 'DRAFT',

    promotionStart: '2026-10-01',
    promotionEnd: '2026-10-15',

    additionalInstructions: null,

    generatedContent: null,

    generatedContentStatus: null,

    publications: [],

    createdAt: '2026-09-22T11:00:00',
    updatedAt: '2026-09-22T11:00:00',
  },

  {
    id: 'cmp-005',

    name: 'Promo TikTok',

    productId: 'prd-001',
    productName: 'Plan Premium',
    productImageUrl: null,

    templateId: 'tpl-003',
    templateName: 'Historia promocional',

    status: 'FAILED',

    promotionStart: null,
    promotionEnd: null,

    additionalInstructions: null,

    generatedContent: {
      headline: 'Lleva tu negocio a otro nivel',

      caption: 'Descubre todo lo que nuestro plan puede hacer por tu negocio.',

      cta: 'Descubre más',

      hashtags: ['#TikTok', '#Marketing', '#Creovexa'],

      finalAssetUrl: null,
    },

    generatedContentStatus: 'CURRENT',

    publications: [
      {
        id: 'pub-005',

        platform: 'TIKTOK',

        status: 'FAILED',

        externalPublicationId: null,

        externalUrl: null,

        failureReason: 'Error de publicación simulado.',
      },
    ],

    createdAt: '2026-09-15T10:00:00',
    updatedAt: '2026-09-22T09:20:00',
  },
];
