import type { OrganizationLogos } from '#app/modules/organizations/application/ports/organization-logos';
import { CampaignImageError } from '#app/modules/campaigns/contract';
import type {
  FlyerLogoSource,
  LoadFlyerLogoInput,
} from '../application/ports/flyer-logo-source.js';
import { LocalImageArtifacts } from './local-image-artifacts.js';

// Lee el logo congelado en el snapshot desde organizations y lo deja como archivo temporal.
export class StoredFlyerLogoSource implements FlyerLogoSource {
  constructor(
    private readonly logos: OrganizationLogos,
    private readonly artifacts: LocalImageArtifacts,
  ) {}

  assertAvailable(): void {}

  async load(input: LoadFlyerLogoInput) {
    let logo;
    try {
      logo = await this.logos.read({
        organizationId: input.organizationId,
        assetId: input.assetId,
      });
    } catch {
      throw new CampaignImageError('LOGO_UNAVAILABLE');
    }
    if (!logo) throw new CampaignImageError('LOGO_UNAVAILABLE');
    return {
      reference: await this.artifacts.write(input, logo.bytes),
      contentType: logo.contentType,
      width: logo.width,
      height: logo.height,
    };
  }
}
