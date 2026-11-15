import { createHash } from 'node:crypto';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import {
  inspectImageBytes,
  prepareUploadedImage,
  InvalidImageFileError,
  MAX_IMAGE_BYTES,
} from '#app/infrastructure/image-files';
import type { ObjectStorage } from '#app/modules/assets/application/ports/object-storage';
import type {
  LogoVariant,
  OrganizationLogos,
  OrganizationLogoSelection,
  SavedOrganizationLogo,
} from '../application/ports/organization-logos.js';
import { OrganizationLogoError } from '../application/errors/organization-logo.error.js';
import { analyzeLogo } from './logo-analysis.js';

const VARIANT_COLUMN = {
  MAIN: 'logoAssetId',
  DARK_BACKGROUND: 'darkBackgroundLogoAssetId',
  ICON: 'iconAssetId',
} as const satisfies Record<LogoVariant, string>;

export class MinioOrganizationLogos implements OrganizationLogos {
  constructor(
    private readonly database: PrismaClient,
    private readonly storage: ObjectStorage,
  ) {}

  async save(
    input: OrganizationLogoSelection & {
      variant: LogoVariant;
      bytes: Uint8Array;
      at: Date;
      expectedUpdatedAt: Date;
    },
  ): Promise<void> {
    const bucket = this.storage.bucket;
    if (!bucket) throw new OrganizationLogoError('UNAVAILABLE');
    try {
      const bytes = await prepareUploadedImage(input.bytes);
      const metadata = await inspectImageBytes(bytes);
      const { isDark, suggestedColors } = await analyzeLogo(bytes);
      const objectKey = `logos/${input.organizationId}/${input.assetId}`;
      const sha256 = digest(bytes);
      const created = await this.storage.putIfAbsent({
        key: objectKey,
        bytes,
        contentType: metadata.contentType,
        sha256,
      });
      // Cada subida usa un id de archivo nuevo, así que una clave ocupada nunca es de esta subida.
      if (!created) throw new OrganizationLogoError('UNAVAILABLE');
      await this.database.$transaction(async (tx) => {
        const changed = await tx.organization.updateMany({
          where: { id: input.organizationId, updatedAt: input.expectedUpdatedAt },
          data: { [VARIANT_COLUMN[input.variant]]: input.assetId, updatedAt: input.at },
        });
        if (changed.count !== 1) throw new OrganizationLogoError('CONFLICT');
        await tx.organizationLogoAsset.create({
          data: {
            id: input.assetId,
            organizationId: input.organizationId,
            bucket,
            objectKey,
            sha256,
            byteLength: bytes.byteLength,
            ...metadata,
            isDark,
            suggestedColors: { ...suggestedColors },
            createdAt: input.at,
          },
        });
      });
      // Los logos reemplazados siguen legibles para los snapshots históricos. Nunca borres tras un commit ambiguo.
    } catch (error) {
      if (error instanceof OrganizationLogoError) throw error;
      if (error instanceof InvalidImageFileError) throw new OrganizationLogoError('INVALID_IMAGE');
      throw new OrganizationLogoError('UNAVAILABLE');
    }
  }

  async read(input: OrganizationLogoSelection): Promise<SavedOrganizationLogo | null> {
    const row = await this.database.organizationLogoAsset.findFirst({
      where: { id: input.assetId, organizationId: input.organizationId },
    });
    if (!row) return null;
    if (!this.storage.bucket || row.bucket !== this.storage.bucket)
      throw new OrganizationLogoError('UNAVAILABLE');
    try {
      const bytes = await this.storage.read(
        row.objectKey,
        Math.min(MAX_IMAGE_BYTES, row.byteLength),
      );
      if (bytes.length !== row.byteLength || digest(bytes) !== row.sha256)
        throw new OrganizationLogoError('UNAVAILABLE');
      const metadata = await inspectImageBytes(bytes);
      if (
        metadata.contentType !== row.contentType ||
        metadata.width !== row.width ||
        metadata.height !== row.height
      )
        throw new OrganizationLogoError('UNAVAILABLE');
      return { bytes, ...metadata };
    } catch {
      throw new OrganizationLogoError('UNAVAILABLE');
    }
  }
}

function digest(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
