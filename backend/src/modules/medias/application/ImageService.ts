import { ValidationError } from '../../../shared/errors/AppError';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type UploadedImage = {
  mimetype: string;
  buffer: Buffer;
};

export interface ImageStorage {
  save(publicId: string, extension: string, content: Buffer): Promise<string>;
  delete(publicId: string): Promise<void>;
}

export function hasValidImageSignature(buffer: Buffer, mimetype: string) {
  if (mimetype === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
  }
  if (mimetype === 'image/webp') {
    return buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

function extensionForMimeType(mimetype: string) {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'jpg';
}

export class ImageService {
  constructor(
    private readonly storage: ImageStorage,
    private readonly generateId: () => string
  ) {}

  async upload(file: UploadedImage | undefined) {
    if (!file) {
      throw new ValidationError('Aucun fichier image fourni.');
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError('Type de fichier non autorisé.');
    }
    if (!hasValidImageSignature(file.buffer, file.mimetype)) {
      throw new ValidationError('Le contenu du fichier ne correspond pas à une image autorisée.');
    }

    const extension = extensionForMimeType(file.mimetype);
    const publicId = `upload-${this.generateId()}`;
    const url = await this.storage.save(publicId, extension, file.buffer);

    return {
      publicId,
      url,
      format: extension,
      width: 0,
      height: 0,
    };
  }

  async delete(publicId: string) {
    const normalizedPublicId = publicId.trim();
    if (!normalizedPublicId) {
      throw new ValidationError('Identifiant image invalide.');
    }
    await this.storage.delete(normalizedPublicId);
  }
}
