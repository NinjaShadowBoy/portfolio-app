import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, concat, concatMap, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CloudinaryService } from './cloudinary.service';
import { Photo } from '../interfaces/project.interface';
import { SerialQueue } from '../utils/serial-queue';

/**
 * Steps of one project photo upload: Cloudinary progress (0-100), then
 * `saving` while the backend records the URL, then the stored photo.
 */
export type PhotoUploadEvent =
  | { type: 'progress'; percent: number }
  | { type: 'saving' }
  | { type: 'done'; photo: Photo };

/**
 * Uploads photos to Cloudinary, then records the resulting URL on the backend.
 *
 * Project photo writes (record, delete, reorder) go out one at a time. The
 * reorder endpoint needs the complete list of a project's photo ids, so it must
 * never race a record or a delete that changes that list on the server.
 */
@Injectable({ providedIn: 'root' })
export class PhotoService {
  private http = inject(HttpClient);
  private cloudinary = inject(CloudinaryService);
  private apiUrl = `${environment.apiBaseUrl}/photos`;
  private projectsUrl = `${environment.apiBaseUrl}/projects`;
  private readonly writes = new SerialQueue();

  uploadProjectPhoto(projectId: number, file: File): Observable<PhotoUploadEvent> {
    return this.cloudinary.uploadProjectPhoto(file, projectId).pipe(
      concatMap((event): Observable<PhotoUploadEvent> =>
        event.type === 'progress'
          ? of(event)
          : concat(
              of({ type: 'saving' } as const),
              this.writes
                .run(() =>
                  this.http.post<Photo>(`${this.apiUrl}/${projectId}`, { photoUrl: event.response.secure_url, projectId })
                )
                .pipe(map((photo) => ({ type: 'done', photo }) as const))
            )
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
    return this.writes.run(() => this.http.delete<void>(`${this.apiUrl}/${photoId}`));
  }

  /**
   * Admin only. Stores a project's photo order: `ids` lists every photo id of
   * the project exactly once, index 0 being the cover. The server rejects a
   * partial list with 400. Pass a function to read the ids when the request
   * starts, after the photo writes queued before it have landed.
   */
  reorderPhotos(projectId: number, ids: readonly number[] | (() => readonly number[])): Observable<void> {
    return this.writes.run(() =>
      this.http.put<void>(`${this.projectsUrl}/${projectId}/photos/order`, {
        ids: typeof ids === 'function' ? ids() : ids,
      })
    );
  }
}
