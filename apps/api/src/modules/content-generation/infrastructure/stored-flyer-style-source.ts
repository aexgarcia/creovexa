import type { TemplateStyleReferences } from '#app/modules/templates/application/ports/template-style-references';
import { CampaignImageError } from '#app/modules/campaigns/contract';
import type {
  FlyerStyleSource,
  LoadFlyerStyleInput,
} from '../application/ports/flyer-style-source.js';
import { LocalImageArtifacts } from './local-image-artifacts.js';

// Lee una referencia de estilo desde templates y la deja como archivo temporal de la operación.
export class StoredFlyerStyleSource implements FlyerStyleSource {
  constructor(
    private readonly references: TemplateStyleReferences,
    private readonly artifacts: LocalImageArtifacts,
  ) {}

  async load(input: LoadFlyerStyleInput) {
    let reference;
    try {
      reference = await this.references.read({
        organizationId: input.organizationId,
        templateId: input.templateId,
        assetId: input.assetId,
      });
    } catch {
      throw new CampaignImageError('UNAVAILABLE');
    }
    // Las referencias son inmutables: si falta una congelada, el snapshot no se puede cumplir.
    if (!reference) throw new CampaignImageError('INVALID_OUTPUT');
    return {
      reference: await this.artifacts.write(input, reference.bytes),
      contentType: reference.contentType,
      width: reference.width,
      height: reference.height,
    };
  }
}
