import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';

import { SERVER_API_TIMEOUT_MS, serverApiTimeoutInterceptor } from './server-api-timeout.interceptor';
import { environment } from '../../../environments/environment';

describe('serverApiTimeoutInterceptor', () => {
  function setup(platform: 'server' | 'browser') {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        provideHttpClient(withInterceptors([serverApiTimeoutInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    return { http: TestBed.inject(HttpClient), backend: TestBed.inject(HttpTestingController) };
  }

  it('fails an unanswered API call on the server instead of waiting forever', fakeAsync(() => {
    const { http, backend } = setup('server');
    let error: unknown;
    http.get(`${environment.apiBaseUrl}/projects`).subscribe({ error: (err) => (error = err) });

    tick(SERVER_API_TIMEOUT_MS + 1);

    expect((error as Error)?.name).toBe('TimeoutError');
    backend.match(`${environment.apiBaseUrl}/projects`);
  }));

  it('leaves browser requests alone', fakeAsync(() => {
    const { http, backend } = setup('browser');
    let error: unknown;
    http.get(`${environment.apiBaseUrl}/projects`).subscribe({ error: (err) => (error = err) });

    tick(SERVER_API_TIMEOUT_MS * 5);

    expect(error).toBeUndefined();
    backend.expectOne(`${environment.apiBaseUrl}/projects`).flush([]);
  }));
});
