import { TestBed } from '@angular/core/testing';
import { HttpEventType, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CloudinaryService, CloudinaryUploadEvent, CloudinaryUploadResponse } from './cloudinary.service';
import { authInterceptor } from '../interceptors/auth.interceptor';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let http: HttpTestingController;
  const file = new File(['x'], 'shot.png', { type: 'image/png' });
  const response = { secure_url: 'https://res.cloudinary.com/demo/shot.png' } as CloudinaryUploadResponse;

  beforeEach(() => {
    localStorage.setItem('auth.token', 'secret-jwt');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(CloudinaryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('auth.token');
  });

  it('reports upload progress, then the stored image', () => {
    const events: CloudinaryUploadEvent[] = [];
    service.uploadProjectPhoto(file, 7).subscribe((event) => events.push(event));

    const req = http.expectOne(service.uploadUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.reportProgress).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('folder')).toBe('portfolio/projects/7');

    req.event({ type: HttpEventType.UploadProgress, loaded: 25, total: 100 });
    req.event({ type: HttpEventType.UploadProgress, loaded: 100, total: 100 });
    req.flush(response);

    expect(events).toEqual([
      { type: 'progress', percent: 25 },
      { type: 'progress', percent: 100 },
      { type: 'done', response },
    ]);
  });

  it('sends no bearer token or credentials to Cloudinary', () => {
    service.uploadProfilePhoto(file).subscribe();

    const req = http.expectOne(service.uploadUrl);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush(response);
  });

  it('still gives profile uploads only the final response', () => {
    const results: CloudinaryUploadResponse[] = [];
    service.uploadProfilePhoto(file).subscribe((result) => results.push(result));

    const req = http.expectOne(service.uploadUrl);
    expect((req.request.body as FormData).get('folder')).toBe('portfolio/profile');
    req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    req.flush(response);

    expect(results).toEqual([response]);
  });

  it("turns Cloudinary's error body into an Error with its message", () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let error: unknown;
    service.uploadImage(file).subscribe({ error: (err) => (error = err) });

    http
      .expectOne(service.uploadUrl)
      .flush({ error: { message: 'File size too large' } }, { status: 400, statusText: 'Bad Request' });

    expect(error).toEqual(new Error('File size too large'));
  });
});
