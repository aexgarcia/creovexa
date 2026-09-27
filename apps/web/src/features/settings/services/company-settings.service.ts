import { companySettingsMock } from '../mocks/company-settings.mock';

import type { CompanySettings, UpdateCompanySettingsInput } from '../types/company-settings.types';

let companySettings = {
  ...companySettingsMock,
};

function delay(ms = 400) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

class CompanySettingsService {
  async get(): Promise<CompanySettings> {
    await delay();

    return {
      ...companySettings,
    };
  }

  async update(input: UpdateCompanySettingsInput): Promise<CompanySettings> {
    await delay();

    companySettings = {
      ...companySettings,

      businessName: input.businessName,

      description: input.description,

      logoUrl: input.logoUrl || null,

      brandTone: input.brandTone,

      primaryColor: input.primaryColor,

      defaultCta: input.defaultCta,

      updatedAt: new Date().toISOString(),
    };

    return {
      ...companySettings,
    };
  }
}

export const companySettingsService = new CompanySettingsService();
