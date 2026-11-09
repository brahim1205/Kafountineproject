import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api/api.service';


export interface UploadResult {
  publicId: string;
  url: string;
  format: string;
  width?: number;
  height?: number;
}

@Injectable({ providedIn: 'root' })
export class UploadApi {
  private readonly api = inject(ApiService);


  async uploadImage(file: File, folder: string = 'kafountine'): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  return this.api.request<UploadResult>('/upload/image', {
    method: 'POST',
    body: formData,
    auth: true,
  });
}

  async deleteImage(publicId: string): Promise<void> {
  await this.api.request<void>(`/upload/image/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
    auth: true,
  });
}
}
