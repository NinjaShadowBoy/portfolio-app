import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, catchError, filter, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/** Progress (0-100) while the file is sent, then the stored image. */
export type CloudinaryUploadEvent =
  | { type: 'progress'; percent: number }
  | { type: 'done'; response: CloudinaryUploadResponse };

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private http = inject(HttpClient);
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
    return this.uploadImageWithProgress(file, folder).pipe(
      filter((event): event is Extract<CloudinaryUploadEvent, { type: 'done' }> => event.type === 'done'),
      map((event) => event.response)
    );
  }

  /** Upload an image, reporting progress before the final response. */
  uploadImageWithProgress(file: File, folder?: string): Observable<CloudinaryUploadEvent> {
    return this.performUpload(file, folder);
  }

  /**
   * Upload a project photo to Cloudinary, with progress
   * @param file The image file
   * @param projectId The project ID for folder organization
   */
  uploadProjectPhoto(
    file: File,
    projectId: number
  ): Observable<CloudinaryUploadEvent> {
    return this.uploadImageWithProgress(file, `portfolio/projects/${projectId}`);
  }

  /**
   * Upload a profile photo to Cloudinary
   * @param file The image file
   */
  uploadProfilePhoto(file: File): Observable<CloudinaryUploadResponse> {
    return this.uploadImage(file, 'portfolio/profile');
  }

  /** The URL of Cloudinary's unsigned upload endpoint for this cloud. */
  get uploadUrl(): string {
    return `https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/image/upload`;
  }

  /**
   * Perform the actual upload to Cloudinary.
   *
   * Upload progress events come from XMLHttpRequest's `upload.onprogress`.
   * HttpClient uses its XHR backend here because app.config does not call
   * `withFetch()`; the fetch backend reports no upload progress, so adding
   * `withFetch()` would leave the bars at 0 until each upload finishes.
   * The URL is outside `environment.apiBaseUrl`, so authInterceptor adds no
   * bearer token or credentials to it.
   */
  private performUpload(file: File, folder?: string): Observable<CloudinaryUploadEvent> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);

    if (folder) {
      formData.append('folder', folder);
    }

    // Add any additional options
    formData.append('cloud_name', this.cloudinaryConfig.cloudName);

    return this.http
      .post<CloudinaryUploadResponse>(this.uploadUrl, formData, { reportProgress: true, observe: 'events' })
      .pipe(
        map((event) => toUploadEvent(event)),
        filter((event): event is CloudinaryUploadEvent => event !== null),
        catchError((error: HttpErrorResponse) => {
          console.error('Cloudinary upload error:', error);
          return throwError(() => new Error(error.error?.error?.message || 'Upload failed'));
        })
      );
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

function toUploadEvent(event: HttpEvent<CloudinaryUploadResponse>): CloudinaryUploadEvent | null {
  if (event.type === HttpEventType.UploadProgress) {
    const percent = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
    return { type: 'progress', percent: Math.min(100, percent) };
  }
  if (event.type === HttpEventType.Response && event.body) {
    return { type: 'done', response: event.body };
  }
  return null;
}
