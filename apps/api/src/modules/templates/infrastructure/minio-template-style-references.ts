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
  SavedStyleReference,
  StyleReferenceSelection,
  TemplateStyleReferences,
} from '../application/ports/template-style-references.js';
import { TemplateStyleReferenceError } from '../application/errors/template-style-reference.error.js';

export class MinioTemplateStyleReferences implements TemplateStyleReferences {
  constructor(
    private readonly database: PrismaClient,
    private readonly storage: ObjectStorage,
  ) {}

  async save(input: StyleReferenceSelection & { bytes: Uint8Array; at: Date }): Promise<void> {
    const bucket = this.storage.bucket;
    if (!bucket) throw new TemplateStyleReferenceError('UNAVAILABLE');
    try {
      const bytes = await prepareUploadedImage(input.bytes);
      const metadata = await inspectImageBytes(bytes);
      const objectKey = `templates/${input.organizationId}/${input.templateId}/${input.assetId}`;
      const sha256 = digest(bytes);
      const created = await this.storage.putIfAbsent({
        key: objectKey,
        bytes,
        contentType: metadata.contentType,
        sha256,
      });
      // Cada subida usa un id nuevo, así que una clave ocupada nunca es de esta subida.
      if (!created) throw new TemplateStyleReferenceError('UNAVAILABLE');
      await this.database.templateStyleAsset.create({
        data: {
          id: input.assetId,
          organizationId: input.organizationId,
          templateId: input.templateId,
          bucket,
          objectKey,
          sha256,
          byteLength: bytes.byteLength,
          ...metadata,
          createdAt: input.at,
        },
      });
    } catch (error) {
      if (error instanceof TemplateStyleReferenceError) throw error;
      if (error instanceof InvalidImageFileError)
        throw new TemplateStyleReferenceError('INVALID_IMAGE');
      throw new TemplateStyleReferenceError('UNAVAILABLE');
    }
  }

  async read(input: StyleReferenceSelection): Promise<SavedStyleReference | null> {
    const row = await this.database.templateStyleAsset.findFirst({
      where: {
        id: input.assetId,
        organizationId: input.organizationId,
        templateId: input.templateId,
      },
    });
    if (!row) return null;
    if (!this.storage.bucket || row.bucket !== this.storage.bucket)
      throw new TemplateStyleReferenceError('UNAVAILABLE');
    try {
      const bytes = await this.storage.read(row.objectKey, MAX_IMAGE_BYTES);
      if (bytes.length !== row.byteLength || digest(bytes) !== row.sha256)
        throw new TemplateStyleReferenceError('UNAVAILABLE');
      return {
        bytes,
        contentType: row.contentType as SavedStyleReference['contentType'],
        width: row.width,
        height: row.height,
      };
    } catch {
      throw new TemplateStyleReferenceError('UNAVAILABLE');
    }
  }
}

function digest(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
