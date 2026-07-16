import { HttpInterceptorFn } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Functional interceptor that, for API requests, sends cookies (the anon_token
 * identity cookie) and attaches the Authorization bearer token when logged in.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);
  if (!isApiRequest) {
    return next(req);
  }

  // withCredentials so the anonymous-identity cookie flows on every API call.
  let apiReq = req.clone({ withCredentials: true });

  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('auth.token');
    if (token) {
      apiReq = apiReq.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(apiReq);
};
