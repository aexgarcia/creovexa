import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export class InvalidImageFileError extends Error {}
export interface ImageFileMetadata {
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
}

export async function prepareUploadedImage(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error();
    const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' }).timeout({
      seconds: 10,
    });
    const metadata = await image.metadata();
    if (!['png', 'jpeg', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1)
      throw new Error();
    return (metadata.orientation ?? 1) === 1 ? bytes : await image.rotate().toBuffer();
  } catch {
    throw new InvalidImageFileError();
  }
}

export async function inspectImageBytes(bytes: Uint8Array): Promise<ImageFileMetadata> {
  try {
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error();
    const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' }).timeout({
      seconds: 10,
    });
    const metadata = await image.metadata();
    if (
      !['png', 'jpeg', 'webp'].includes(metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) !== 1 ||
      (metadata.orientation ?? 1) !== 1
    )
      throw new Error();
    await image.stats();
    return {
      contentType: `image/${metadata.format}` as ImageFileMetadata['contentType'],
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    throw new InvalidImageFileError();
  }
}

/** Si algún píxel es transparente o translúcido; una imagen sin canal alfa no lo es. */
export async function imageHasTransparency(bytes: Uint8Array): Promise<boolean> {
  try {
    const image = sharp(bytes, { limitInputPixels: 16_000_000 }).timeout({ seconds: 10 });
    if (!(await image.metadata()).hasAlpha) return false;
    const { channels } = await image.stats();
    return (channels[3]?.min ?? 255) < 255;
  } catch {
    throw new InvalidImageFileError();
  }
}
