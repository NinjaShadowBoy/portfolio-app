import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CloudinaryService } from './cloudinary.service';
import { Photo } from '../interfaces/project.interface';

/** Uploads photos to Cloudinary, then records the resulting URL on the backend. */
@Injectable({ providedIn: 'root' })
export class PhotoService {
  private http = inject(HttpClient);
  private cloudinary = inject(CloudinaryService);
  private apiUrl = `${environment.apiBaseUrl}/photos`;

  uploadProjectPhoto(projectId: number, file: File): Observable<Photo> {
    return this.cloudinary.uploadProjectPhoto(file, projectId).pipe(
      switchMap(({ secure_url }) =>
        this.http.post<Photo>(`${this.apiUrl}/${projectId}`, { photoUrl: secure_url, projectId })
      )
    );
  }

  uploadProfilePhoto(file: File): Observable<Photo> {
    return this.cloudinary.uploadProfilePhoto(file).pipe(
      switchMap(({ secure_url }) =>
        this.http.post<Photo>(`${this.apiUrl}/profile`, { photoUrl: secure_url })
      )
    );
  }

  /** Deletes the database record only; Cloudinary assets are managed elsewhere. */
  deletePhoto(photoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${photoId}`);
  }
}
