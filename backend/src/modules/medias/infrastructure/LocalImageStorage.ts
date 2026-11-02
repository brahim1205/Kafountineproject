import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NotFoundError } from '../../../shared/errors/AppError';
import type { ImageStorage } from '../application/ImageService';

export class LocalImageStorage implements ImageStorage {
  constructor(private readonly directory = path.resolve(process.cwd(), 'uploads')) {}

  async save(publicId: string, extension: string, content: Buffer) {
    const filename = `${publicId}.${extension}`;
    await fs.mkdir(this.directory, { recursive: true });
    await fs.writeFile(path.join(this.directory, filename), content);
    return `/uploads/${filename}`;
  }

  async delete(publicId: string) {
    const entries = await fs.readdir(this.directory).catch(() => []);
    const match = entries.find((entry) => entry.startsWith(`${publicId}.`));
    if (!match) {
      throw new NotFoundError('Image introuvable.');
    }

    await fs.unlink(path.join(this.directory, match));
  }
}
