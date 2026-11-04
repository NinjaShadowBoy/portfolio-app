import { HttpInterceptorFn } from '@angular/common/http';
import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Upper bound for an API call made while rendering on the server.
 *
 * Server rendering, including the build-time prerender in `ng build`, waits
 * for every pending request before it writes the page. Without a bound, an API
 * that accepts the connection but never answers (a VPS mid-restart behind
 * Cloudflare) stalls each page until Angular aborts the render, and the build
 * fails with "Prerendered 0 static routes". Callers already fall back on error
 * (ProjectDataService serves its fallback list), so the page still renders.
 */
export const SERVER_API_TIMEOUT_MS = 2000;

export const serverApiTimeoutInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformServer(inject(PLATFORM_ID)) || !req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }
  return next(req).pipe(timeout(SERVER_API_TIMEOUT_MS));
};
