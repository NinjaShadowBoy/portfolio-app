import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PhotoDto {
  id: number;
  photoUrl: string;
  projectId: number;
}

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/photos`;

  /**
   * Upload a photo for a specific project
   */
  uploadProjectPhoto(projectId: number, file: File): Observable<PhotoDto> {
    const formData = new FormData();
    formData.append('photo', file);

    return this.http.put<PhotoDto>(
      `${this.apiUrl}/${projectId}`,
      formData
    );
  }

  /**
   * Delete a photo by ID
   */
  deletePhoto(photoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${photoId}`);
  }

  /**
   * Upload or update profile photo
   */
  uploadProfilePhoto(file: File): Observable<PhotoDto> {
    const formData = new FormData();
    formData.append('photo', file);

    return this.http.put<PhotoDto>(`${this.apiUrl}/profile`, formData);
  }
}
