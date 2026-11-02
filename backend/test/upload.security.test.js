describe('upload security', () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');

  it('rejects files whose binary signature does not match an allowed image type', async () => {
    const { PlaceholderDocumentsService } = require('../dist/src/modules/placeholders/presentation/PlaceholderDocumentsService');
    const service = new PlaceholderDocumentsService({});

    await expect(service.uploadImage({
      mimetype: 'image/png',
      originalname: 'fake.png',
      buffer: Buffer.from('not a png'),
    })).rejects.toThrow('contenu du fichier');
  });

  it('accepts a valid PNG signature', async () => {
    const { PlaceholderDocumentsService } = require('../dist/src/modules/placeholders/presentation/PlaceholderDocumentsService');
    const service = new PlaceholderDocumentsService({});
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    const result = await service.uploadImage({
      mimetype: 'image/png',
      originalname: 'image.png',
      buffer: png,
    });

    expect(result.publicId).toMatch(/^upload-/);
    expect(result.format).toBe('png');

    await fs.unlink(path.resolve(process.cwd(), result.url.replace(/^\//, '')));
  });
});
