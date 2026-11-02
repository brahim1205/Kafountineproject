import type { Request, Response } from 'express';
import multer from 'multer';
import { env } from '../../../shared/config/env';
import { ValidationError } from '../../../shared/errors/AppError';
import { message, ok } from '../../../shared/http/response';
import { ALLOWED_IMAGE_MIME_TYPES, type ImageService } from '../application/ImageService';

export class MediasController {
  readonly upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.maxUploadFileSizeBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
        callback(new ValidationError('Type de fichier non autorisé. Utilisez JPG, PNG ou WEBP.'));
        return;
      }
      callback(null, true);
    },
  });

  constructor(private readonly imageService: ImageService) {}

  async uploadImage(req: Request, res: Response) {
    return ok(res, await this.imageService.upload(req.file), 201);
  }

  async deleteImage(req: Request, res: Response) {
    await this.imageService.delete(String(req.params.publicId || ''));
    return message(res, 'Image supprimée');
  }
}
