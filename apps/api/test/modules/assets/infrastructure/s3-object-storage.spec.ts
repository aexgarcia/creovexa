import { ObjectStorageError } from '#app/modules/assets/application/ports/object-storage';
import { S3ObjectStorage } from '#app/modules/assets/infrastructure/s3-object-storage';

describe('S3ObjectStorage without configuration', () => {
  const storage = new S3ObjectStorage(null);

  it('reports no bucket so callers can fail before doing any work', () => {
    expect(storage.bucket).toBeNull();
  });

  it('rejects writes and reads as unavailable', async () => {
    const write = storage.putIfAbsent({
      key: 'a/b',
      bytes: new Uint8Array([1]),
      contentType: 'image/png',
      sha256: 'x',
    });
    await expect(write).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    await expect(storage.read('a/b', 10)).rejects.toBeInstanceOf(ObjectStorageError);
  });

  it('closes without a client', () => {
    expect(() => storage.close()).not.toThrow();
  });
});
