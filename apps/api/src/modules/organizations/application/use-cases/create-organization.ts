import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { Organization } from '../../domain/entities/organization.js';
import type { OrganizationRepository } from '../../domain/repositories/organization.repository.js';
import type { BrandColors } from '../../domain/value-objects/brand-colors.js';
import type { RegionInput } from '../../domain/value-objects/region.js';
import type {
  AddressForm,
  ContactInput,
  EmojiStyle,
  Typography,
} from '../../domain/value-objects/brand-voice.js';
import { organizationResult, type OrganizationResult } from '../organization-result.js';

export interface CreateOrganizationInput {
  name: string;
  description?: string;
  brandTone?: string | null;
  industry?: string | null;
  region?: RegionInput;
  brandColors?: BrandColors | null;
  typography?: Typography | null;
  visualStyle?: readonly string[];
  contact?: ContactInput | null;
  defaultLegalText?: string | null;
  forbiddenWords?: readonly string[];
  audience?: string | null;
  valueProps?: readonly string[];
  emojiStyle?: EmojiStyle | null;
  addressForm?: AddressForm | null;
  copyExamples?: readonly string[];
  logoAssetId?: string | null;
  darkBackgroundLogoAssetId?: string | null;
  iconAssetId?: string | null;
}

export class CreateOrganization {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<OrganizationResult> {
    const organization = Organization.create(this.ids.next(), input, this.clock.now());
    await this.organizations.add(organization);
    return organizationResult(organization);
  }
}
