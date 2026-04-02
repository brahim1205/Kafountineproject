import { apiRequest } from './api';

export interface UploadResult {
  publicId: string;
  url: string;
  format: string;
  width?: number;
  height?: number;
}

export async function uploadImage(
  file: File,
  folder: string = 'kafountine'
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  return apiRequest<UploadResult>('/upload/image', {
    method: 'POST',
    body: formData,
    auth: true,
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  await apiRequest<void>(`/upload/image/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
    auth: true,
  });
}

export default {
  uploadImage,
  deleteImage,
};
