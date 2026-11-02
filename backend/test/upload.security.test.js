describe('upload security', () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');

  function buildImageService() {
    const { randomUUID } = require('node:crypto');
    const { ImageService } = require('../dist/src/modules/medias/application/ImageService');
    const { LocalImageStorage } = require('../dist/src/modules/medias/infrastructure/LocalImageStorage');
    return new ImageService(new LocalImageStorage(), randomUUID);
  }

  it('rejects files whose binary signature does not match an allowed image type', async () => {
    const service = buildImageService();

    await expect(service.upload({
      mimetype: 'image/png',
      originalname: 'fake.png',
      buffer: Buffer.from('not a png'),
    })).rejects.toThrow('contenu du fichier');
  });

  it('accepts a valid PNG signature', async () => {
    const service = buildImageService();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    const result = await service.upload({
      mimetype: 'image/png',
      originalname: 'image.png',
      buffer: png,
    });

    expect(result.publicId).toMatch(/^upload-/);
    expect(result.format).toBe('png');

    await fs.unlink(path.resolve(process.cwd(), result.url.replace(/^\//, '')));
  });
});
