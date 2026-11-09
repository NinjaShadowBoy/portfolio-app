import { Mocked } from 'vitest';
import { createSpyObj } from '../../../testing/create-spy-obj';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { PhotoService, PhotoUploadEvent } from './photo.service';
import { CloudinaryService, CloudinaryUploadEvent, CloudinaryUploadResponse } from './cloudinary.service';
import { environment } from '../../../environments/environment';

describe('PhotoService', () => {
  let service: PhotoService;
  let http: HttpTestingController;
  let cloudinary: Mocked<CloudinaryService>;
  const file = new File(['x'], 'shot.png', { type: 'image/png' });
  const upload = { secure_url: 'https://res.cloudinary.com/demo/shot.png' } as CloudinaryUploadResponse;

  beforeEach(() => {
    cloudinary = createSpyObj<CloudinaryService>([
      'uploadProjectPhoto',
      'uploadProfilePhoto',
    ]);
    cloudinary.uploadProjectPhoto.mockReturnValue(of<CloudinaryUploadEvent[]>({ type: 'progress', percent: 40 }, { type: 'done', response: upload }));
    cloudinary.uploadProfilePhoto.mockReturnValue(of(upload));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CloudinaryService, useValue: cloudinary },
      ],
    });
    service = TestBed.inject(PhotoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploads a project photo to Cloudinary, then records the URL for that project', () => {
    const events: PhotoUploadEvent[] = [];
    service.uploadProjectPhoto(7, file).subscribe((event) => events.push(event));

    expect(cloudinary.uploadProjectPhoto).toHaveBeenCalledWith(file, 7);
    const req = http.expectOne(`${environment.apiBaseUrl}/photos/7`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ photoUrl: upload.secure_url, projectId: 7 });
    const photo = { id: 3, photoUrl: upload.secure_url, projectId: 7, displayOrder: 0 };
    req.flush(photo);

    expect(events).toEqual([{ type: 'progress', percent: 40 }, { type: 'saving' }, { type: 'done', photo }]);
  });

  it('records a profile photo without a project id', () => {
    service.uploadProfilePhoto(file).subscribe();

    const req = http.expectOne(`${environment.apiBaseUrl}/photos/profile`);
    expect(req.request.body).toEqual({ photoUrl: upload.secure_url });
    req.flush({});
  });

  it('deletes a photo record by id', () => {
    service.deletePhoto(3).subscribe();

    const req = http.expectOne(`${environment.apiBaseUrl}/photos/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('stores a project photo order with the full id list', () => {
    let done = false;
    service.reorderPhotos(7, [12, 10, 11]).subscribe({ complete: () => (done = true) });

    const req = http.expectOne(`${environment.apiBaseUrl}/projects/7/photos/order`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ ids: [12, 10, 11] });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });

  it('sends photo writes one at a time, reading lazy reorder ids when the request starts', () => {
    let ids = [1, 2, 3];
    service.deletePhoto(2).subscribe({ complete: () => (ids = [1, 3]) });
    service.reorderPhotos(7, () => ids).subscribe();

    // The reorder waits for the delete, which changes the list it must send.
    http.expectNone(`${environment.apiBaseUrl}/projects/7/photos/order`);
    http.expectOne(`${environment.apiBaseUrl}/photos/2`).flush(null);

    expect(http.expectOne(`${environment.apiBaseUrl}/projects/7/photos/order`).request.body).toEqual({ ids: [1, 3] });
  });

  it('starts the next write after a failed one', () => {
    const failed = vi.fn();
    service.reorderPhotos(7, [1]).subscribe({ error: failed });
    service.deletePhoto(1).subscribe();

    http
      .expectOne(`${environment.apiBaseUrl}/projects/7/photos/order`)
      .flush({ error: 'bad' }, { status: 400, statusText: 'Bad Request' });

    expect(failed).toHaveBeenCalled();
    http.expectOne(`${environment.apiBaseUrl}/photos/1`).flush(null);
  });
});
