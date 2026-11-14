import { randomUUID } from 'node:crypto';
import { mkdir, open, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { entityId } from '#app/domain/entity-id';
import { CampaignImageError } from '#app/modules/campaigns/contract';
import type { CampaignImageSelection, ImageArtifact } from '../application/ports/image-artifact.js';

import { MAX_IMAGE_BYTES } from '#app/infrastructure/image-files';
export { MAX_IMAGE_BYTES } from '#app/infrastructure/image-files';
type ArtifactScope = CampaignImageSelection & { operationId: string };

// Server-owned staging directory. References are opaque UUIDs, never paths or URLs.
export class LocalImageArtifacts {
  private readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }

  async write(scope: ArtifactScope, bytes: Uint8Array): Promise<string> {
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES)
      throw new CampaignImageError('INVALID_OUTPUT');
    const reference = randomUUID();
    const directory = this.directory(scope);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(join(directory, reference), bytes, { flag: 'wx', mode: 0o600 });
    return reference;
  }

  async read(input: ArtifactScope & { source: ImageArtifact }): Promise<Buffer> {
    try {
      const path = join(this.directory(input), entityId(input.source.reference));
      const file = await open(path, 'r');
      try {
        const info = await file.stat();
        if (!info.isFile() || info.size <= 0 || info.size > MAX_IMAGE_BYTES)
          throw new CampaignImageError('INVALID_OUTPUT');
        const bytes = Buffer.alloc(info.size);
        let offset = 0;
        while (offset < bytes.length) {
          const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, offset);
          if (bytesRead === 0) throw new CampaignImageError('INVALID_OUTPUT');
          offset += bytesRead;
        }
        return bytes;
      } finally {
        await file.close();
      }
    } catch {
      throw new CampaignImageError('INVALID_OUTPUT');
    }
  }

  private directory(scope: ArtifactScope): string {
    return join(
      this.root,
      ...[scope.organizationId, scope.campaignId, scope.generationId, scope.operationId].map((id) =>
        entityId(id),
      ),
    );
  }
}
