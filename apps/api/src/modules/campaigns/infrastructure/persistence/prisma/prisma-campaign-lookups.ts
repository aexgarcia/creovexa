import type { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import type { CampaignLookups } from '../../../application/ports/campaign-lookups.js';
import type { GenerationResources } from '../../../domain/value-objects/generation-snapshot.js';

type BrandColors = NonNullable<GenerationResources['organization']['brandColors']>;
type Contact = NonNullable<GenerationResources['organization']['contact']>;

/** Las consultas implementan los ports del consumidor sin importar entidades de otros módulos. */
export class PrismaCampaignLookups implements CampaignLookups {
  constructor(private readonly database: PrismaService) {}

  readonly organizations: CampaignLookups['organizations'] = {
    findById: async (id) => {
      const row = await this.database.organization.findUnique({ where: { id } });
      if (row === null) return null;
      // Lo derivado del logo principal (si es oscuro y los colores propuestos) vive en su asset.
      const logo =
        row.logoAssetId === null
          ? null
          : await this.database.organizationLogoAsset.findFirst({
              where: { organizationId: id, id: row.logoAssetId },
              select: { isDark: true, suggestedColors: true },
            });
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        brandTone: row.brandTone,
        industry: row.industry,
        region: {
          country: row.country,
          locale: row.locale,
          timeZone: row.timeZone,
          currency: row.defaultCurrency,
        },
        // Los colores fijados en el kit mandan; si no hay, los propuestos desde el logo.
        brandColors: (row.brandColors ?? logo?.suggestedColors ?? null) as BrandColors | null,
        typography: row.typography,
        visualStyle: row.visualStyle,
        contact: row.contact as Contact | null,
        defaultLegalText: row.defaultLegalText,
        forbiddenWords: row.forbiddenWords,
        logoAssetId: row.logoAssetId,
        darkBackgroundLogoAssetId: row.darkBackgroundLogoAssetId,
        iconAssetId: row.iconAssetId,
        logoIsDark: logo?.isDark ?? null,
      };
    },
  };
  readonly products: CampaignLookups['products'] = {
    findById: async (organizationId, id) => {
      const row = await this.database.product.findUnique({
        where: { organizationId_id: { organizationId, id } },
      });
      if (row === null) return null;
      const image =
        row.imageAssetIds.length === 0
          ? null
          : await this.database.productImageAsset.findFirst({
              where: { organizationId, productId: id, id: row.imageAssetIds[0] },
              select: { photoType: true, hasTransparency: true },
            });
      return {
        id: row.id,
        organizationId: row.organizationId,
        kind: row.kind,
        name: row.name,
        shortName: row.shortName,
        productBrand: row.productBrand,
        description: row.description,
        keyAttributes: row.keyAttributes,
        unit: row.unit,
        regularPrice: { amountMinor: Number(row.amountMinor), currency: row.currency },
        imageAssetIds: row.imageAssetIds,
        photoType: image?.photoType ?? null,
        hasTransparency: image?.hasTransparency ?? null,
      };
    },
  };
  readonly templates: CampaignLookups['templates'] = {
    findRevision: async (organizationId, templateId, id) => {
      const row = await this.database.templateRevision.findUnique({
        where: { organizationId_templateId_id: { organizationId, templateId, id } },
      });
      return row === null
        ? null
        : {
            id: row.templateId,
            organizationId: row.organizationId,
            revisionId: row.id,
            revisionNumber: Number(row.number),
            width: row.width,
            height: row.height,
            design: row.design,
          };
    },
  };
}
