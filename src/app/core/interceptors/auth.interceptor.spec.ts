import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  it('sends credentials and the bearer token on API requests when logged in', () => {
    localStorage.setItem('auth.token', 'jwt-123');
    http.get(`${environment.apiBaseUrl}/projects`).subscribe();

    const req = controller.expectOne(`${environment.apiBaseUrl}/projects`);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    req.flush([]);
  });

  it('sends credentials but no Authorization header when logged out', () => {
    http.get(`${environment.apiBaseUrl}/projects`).subscribe();

    const req = controller.expectOne(`${environment.apiBaseUrl}/projects`);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('leaves non-API requests untouched', () => {
    localStorage.setItem('auth.token', 'jwt-123');
    http.get('/assets/articles/hello.en.json').subscribe();

    const req = controller.expectOne('/assets/articles/hello.en.json');
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
