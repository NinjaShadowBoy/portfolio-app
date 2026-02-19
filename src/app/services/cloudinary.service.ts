import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private cloudinaryConfig = environment.cloudinary;

  /**
   * Upload an image file to Cloudinary
   * @param file The image file to upload
   * @param folder Optional folder path in Cloudinary
   * @returns Observable with the Cloudinary response containing the URL
   */
  uploadImage(
    file: File,
    folder?: string
  ): Observable<CloudinaryUploadResponse> {
    return from(this.performUpload(file, folder));
  }

  /**
   * Upload a project photo to Cloudinary
   * @param file The image file
   * @param projectId The project ID for folder organization
   */
  uploadProjectPhoto(
    file: File,
    projectId: number
  ): Observable<CloudinaryUploadResponse> {
    return this.uploadImage(file, `portfolio/projects/${projectId}`);
  }

  /**
   * Upload a profile photo to Cloudinary
   * @param file The image file
   */
  uploadProfilePhoto(file: File): Observable<CloudinaryUploadResponse> {
    return this.uploadImage(file, 'portfolio/profile');
  }

  /**
   * Perform the actual upload to Cloudinary
   */
  private async performUpload(
    file: File,
    folder?: string
  ): Promise<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);

    if (folder) {
      formData.append('folder', folder);
    }

    // Add any additional options
    formData.append('cloud_name', this.cloudinaryConfig.cloudName);

    const url = `https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/image/upload`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   * @param url The Cloudinary URL
   * @returns The public_id
   */
  extractPublicId(url: string): string | null {
    try {
      const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a transformed image URL
   * @param publicId The public_id of the image
   * @param transformations Cloudinary transformation string
   * @returns The transformed image URL
   */
  getTransformedUrl(publicId: string, transformations: string): string {
    return `https://res.cloudinary.com/${this.cloudinaryConfig.cloudName}/image/upload/${transformations}/${publicId}`;
  }

  /**
   * Get optimized thumbnail URL
   * @param url Original Cloudinary URL
   * @param width Desired width
   * @param height Desired height
   */
  getThumbnailUrl(url: string, width: number = 300, height: number = 200): string {
    const publicId = this.extractPublicId(url);
    if (!publicId) return url;

    return this.getTransformedUrl(
      publicId,
      `w_${width},h_${height},c_fill,q_auto,f_auto`
    );
  }
}
