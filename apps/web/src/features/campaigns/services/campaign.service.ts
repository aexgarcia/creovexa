import { campaignsMock } from '../mocks/campaigns.mock';

import { productService } from '@/features/products/services/product.service';
import { templateService } from '@/features/templates/services/template.service';

import type {
  Campaign,
  CampaignPublication,
  CreateCampaignInput,
  SocialPlatform,
  UpdateCampaignInput,
} from '../types/campaign.types';

let campaigns = [...campaignsMock];

function delay(ms = 400) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

class CampaignService {
  async findAll(): Promise<Campaign[]> {
    await delay();

    return [...campaigns];
  }

  async findById(id: string): Promise<Campaign> {
    await delay();

    const campaign = campaigns.find((item) => item.id === id);

    if (!campaign) {
      throw new Error('Campaña no encontrada');
    }

    return campaign;
  }

  async create(input: CreateCampaignInput): Promise<Campaign> {
    await delay();

    const [product, template] = await Promise.all([
      productService.findById(input.productId),
      templateService.findById(input.templateId),
    ]);

    const now = new Date().toISOString();

    const campaign: Campaign = {
      id: crypto.randomUUID(),

      name: input.name,

      productId: product.id,
      productName: product.name,
      productImageUrl: null,

      templateId: template.id,
      templateName: template.name,

      status: 'DRAFT',

      promotionStart: input.promotionStart || null,

      promotionEnd: input.promotionEnd || null,

      additionalInstructions: input.additionalInstructions || null,

      generatedContent: null,
      generatedContentStatus: null,

      publications: [],

      createdAt: now,
      updatedAt: now,
    };

    campaigns = [campaign, ...campaigns];

    return campaign;
  }

  async update(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    await delay();

    const index = campaigns.findIndex((campaign) => campaign.id === id);

    if (index === -1) {
      throw new Error('Campaña no encontrada');
    }

    const current = campaigns[index];

    if (current.status !== 'DRAFT' && current.status !== 'PENDING_APPROVAL') {
      throw new Error('Solo se pueden editar campañas en borrador o pendientes de aprobación');
    }

    const [product, template] = await Promise.all([
      productService.findById(input.productId),
      templateService.findById(input.templateId),
    ]);

    const updated: Campaign = {
      ...current,

      name: input.name,

      productId: product.id,
      productName: product.name,
      productImageUrl: null,

      templateId: template.id,
      templateName: template.name,

      promotionStart: input.promotionStart || null,

      promotionEnd: input.promotionEnd || null,

      additionalInstructions: input.additionalInstructions || null,

      generatedContentStatus: 'CURRENT',

      updatedAt: new Date().toISOString(),
    };

    campaigns[index] = updated;

    return updated;
  }

  async generate(id: string): Promise<Campaign> {
    await delay(800);

    const index = campaigns.findIndex((campaign) => campaign.id === id);

    if (index === -1) {
      throw new Error('Campaña no encontrada');
    }

    const campaign = campaigns[index];

    if (campaign.status !== 'DRAFT') {
      throw new Error('Solo una campaña en borrador puede generar contenido');
    }

    const updated: Campaign = {
      ...campaign,

      status: 'PENDING_APPROVAL',

      generatedContent: {
        headline: 'Una promoción que no querrás dejar pasar',

        caption: 'Descubre esta oferta especial y aprovecha sus beneficios por tiempo limitado.',

        cta: 'Conoce más',

        hashtags: ['#Promoción', '#OfertaEspecial', '#Creovexa'],

        finalAssetUrl: campaign.productImageUrl,
      },

      updatedAt: new Date().toISOString(),
    };

    campaigns[index] = updated;

    return updated;
  }

  async approve(id: string): Promise<Campaign> {
    await delay();

    const index = campaigns.findIndex((campaign) => campaign.id === id);

    if (index === -1) {
      throw new Error('Campaña no encontrada');
    }

    const campaign = campaigns[index];

    if (campaign.status !== 'PENDING_APPROVAL') {
      throw new Error('La campaña no está pendiente de aprobación');
    }

    if (campaign.generatedContentStatus === 'STALE') {
      throw new Error('El contenido está desactualizado. Regenera la campaña antes de aprobarla.');
    }

    if (!campaign.generatedContent) {
      throw new Error('La campaña no tiene contenido generado');
    }

    if (!campaign.generatedContent.finalAssetUrl) {
      throw new Error('La campaña no tiene un flyer final generado');
    }

    const updated: Campaign = {
      ...campaign,

      status: 'APPROVED',

      updatedAt: new Date().toISOString(),
    };

    campaigns[index] = updated;

    return updated;
  }

  async publish(id: string, platforms: SocialPlatform[]): Promise<Campaign> {
    await delay(800);

    const index = campaigns.findIndex((campaign) => campaign.id === id);

    if (index === -1) {
      throw new Error('Campaña no encontrada');
    }

    const campaign = campaigns[index];

    if (campaign.status !== 'APPROVED') {
      throw new Error('Solo una campaña aprobada puede publicarse');
    }

    if (!campaign.generatedContent?.finalAssetUrl) {
      throw new Error('La campaña no tiene un asset final generado');
    }

    if (platforms.length === 0) {
      throw new Error('Selecciona al menos una plataforma');
    }

    const publications = platforms.map((platform): CampaignPublication => {
      /*
       * Mock:
       * simulamos éxito excepto TikTok,
       * para poder visualizar errores
       * independientes por plataforma.
       */

      if (platform === 'TIKTOK') {
        return {
          id: crypto.randomUUID(),

          platform,

          status: 'FAILED',

          externalPublicationId: null,

          externalUrl: null,

          failureReason: 'Mock: error de publicación en TikTok',
        };
      }

      return {
        id: crypto.randomUUID(),

        platform,

        status: 'PUBLISHED',

        externalPublicationId: `mock-${platform.toLowerCase()}-${Date.now()}`,

        externalUrl: null,

        failureReason: null,
      };
    });

    const hasSuccess = publications.some((publication) => publication.status === 'PUBLISHED');

    const updated: Campaign = {
      ...campaign,

      status: hasSuccess ? 'PUBLISHED' : 'FAILED',

      publications: [...campaign.publications, ...publications],

      updatedAt: new Date().toISOString(),
    };

    campaigns[index] = updated;

    return updated;
  }

  async regenerate(id: string): Promise<Campaign> {
    await delay(800);

    const index = campaigns.findIndex((campaign) => campaign.id === id);

    if (index === -1) {
      throw new Error('Campaña no encontrada');
    }

    const campaign = campaigns[index];

    if (campaign.status !== 'PENDING_APPROVAL') {
      throw new Error('Solo se puede regenerar contenido pendiente de aprobación');
    }

    const updated: Campaign = {
      ...campaign,

      generatedContent: {
        headline: 'Una promoción que no querrás dejar pasar',

        caption: 'Descubre esta oferta especial y aprovecha sus beneficios por tiempo limitado.',

        cta: 'Conoce más',

        hashtags: ['#Promoción', '#OfertaEspecial', '#Creovexa'],

        finalAssetUrl: campaign.productImageUrl,
      },

      generatedContentStatus: 'CURRENT',

      updatedAt: new Date().toISOString(),
    };

    campaigns[index] = updated;

    return updated;
  }
}

export const campaignService = new CampaignService();
