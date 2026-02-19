import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CloudinaryService } from './cloudinary.service';

export interface PhotoDto {
  id: number;
  photoUrl: string;
  projectId: number;
}

export interface PhotoCreateRequest {
  photoUrl: string;
  projectId: number;
}

export interface ProfilePhotoCreateRequest {
  photoUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  private http = inject(HttpClient);
  private cloudinary = inject(CloudinaryService);
  private apiUrl = `${environment.apiBaseUrl}/photos`;

  /**
   * Upload a photo for a specific project
   * First uploads to Cloudinary, then saves the URL to backend
   */
  uploadProjectPhoto(projectId: number, file: File): Observable<PhotoDto> {
    return this.cloudinary.uploadProjectPhoto(file, projectId).pipe(
      switchMap((cloudinaryResponse) => {
        const request: PhotoCreateRequest = {
          photoUrl: cloudinaryResponse.secure_url,
          projectId: projectId,
        };
        return this.http.post<PhotoDto>(`${this.apiUrl}/${projectId}`, request);
      })
    );
  }

  /**
   * Delete a photo by ID
   * Note: This only deletes the database record
   * Cloudinary images should be managed via Cloudinary dashboard or backend
   */
  deletePhoto(photoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${photoId}`);
  }

  /**
   * Upload or update profile photo
   * First uploads to Cloudinary, then saves the URL to backend
   */
  uploadProfilePhoto(file: File): Observable<PhotoDto> {
    return this.cloudinary.uploadProfilePhoto(file).pipe(
      switchMap((cloudinaryResponse) => {
        const request: ProfilePhotoCreateRequest = {
          photoUrl: cloudinaryResponse.secure_url,
        };
        return this.http.post<PhotoDto>(`${this.apiUrl}/profile`, request);
      })
    );
  }
}
