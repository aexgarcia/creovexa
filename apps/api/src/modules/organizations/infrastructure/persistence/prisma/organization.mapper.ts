import type {
  Organization as OrganizationRecord,
  OrganizationLogoAsset,
} from '#app/infrastructure/persistence/prisma/generated/client';
import type { Currency } from '#app/domain/value-objects/money';
import { Organization } from '../../../domain/entities/organization.js';
import { brandColors, logoTraits } from '../../../domain/value-objects/brand-colors.js';
import type { Contact } from '../../../domain/value-objects/brand-voice.js';

export type LogoTraitsRecord = Pick<OrganizationLogoAsset, 'isDark' | 'suggestedColors'>;

export class OrganizationMapper {
  /** logo: la fila del logo actual; los logos subidos antes del kit de marca no tienen rasgos. */
  static toDomain(row: OrganizationRecord, logo: LogoTraitsRecord | null = null): Organization {
    return Organization.restore(
      row.id,
      {
        name: row.name,
        description: row.description,
        brandTone: row.brandTone,
        industry: row.industry,
        region: {
          country: row.country,
          locale: row.locale,
          timeZone: row.timeZone,
          currency: row.defaultCurrency as Currency,
        },
        brandColors: row.brandColors == null ? null : brandColors(row.brandColors),
        typography: row.typography,
        visualStyle: row.visualStyle,
        contact: row.contact as Contact | null,
        defaultLegalText: row.defaultLegalText,
        forbiddenWords: row.forbiddenWords,
        audience: row.audience,
        valueProps: row.valueProps,
        emojiStyle: row.emojiStyle,
        addressForm: row.addressForm,
        copyExamples: row.copyExamples,
        logoAssetId: row.logoAssetId,
        darkBackgroundLogoAssetId: row.darkBackgroundLogoAssetId,
        iconAssetId: row.iconAssetId,
      },
      row.createdAt,
      row.updatedAt,
      logo?.isDark == null
        ? null
        : logoTraits({ isDark: logo.isDark, suggestedColors: logo.suggestedColors }),
    );
  }

  static toPersistence(organization: Organization): OrganizationRecord {
    return {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      brandTone: organization.brandTone,
      industry: organization.industry,
      country: organization.region.country,
      locale: organization.region.locale,
      timeZone: organization.region.timeZone,
      defaultCurrency: organization.region.currency,
      brandColors: organization.brandColors ? { ...organization.brandColors } : null,
      typography: organization.typography,
      visualStyle: [...organization.visualStyle],
      contact: organization.contact ? { ...organization.contact } : null,
      defaultLegalText: organization.defaultLegalText,
      forbiddenWords: [...organization.forbiddenWords],
      audience: organization.audience,
      valueProps: [...organization.valueProps],
      emojiStyle: organization.emojiStyle,
      addressForm: organization.addressForm,
      copyExamples: [...organization.copyExamples],
      logoAssetId: organization.logoAssetId,
      darkBackgroundLogoAssetId: organization.darkBackgroundLogoAssetId,
      iconAssetId: organization.iconAssetId,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
