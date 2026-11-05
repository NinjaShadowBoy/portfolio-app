import { Mocked } from 'vitest';
import { createSpyObj } from '../../../testing/create-spy-obj';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { PhotoService } from './photo.service';
import { CloudinaryService, CloudinaryUploadResponse } from './cloudinary.service';
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
    cloudinary.uploadProjectPhoto.mockReturnValue(of(upload));
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
    service.uploadProjectPhoto(7, file).subscribe();

    expect(cloudinary.uploadProjectPhoto).toHaveBeenCalledWith(file, 7);
    const req = http.expectOne(`${environment.apiBaseUrl}/photos/7`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ photoUrl: upload.secure_url, projectId: 7 });
    req.flush({});
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
});
