import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * Functional interceptor (Angular 16+) that attaches Authorization bearer token if present.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('auth.token');

  if (!token) {
    return next(req);
  }

  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);
  if (!isApiRequest) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
  return next(cloned);
};


