import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideClientHydration } from '@angular/platform-browser';
import {
  ArticleContentLoader,
  HttpArticleContentLoader,
} from './core/services/article-content-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    // Optimize change detection for better TBT
    provideZoneChangeDetection({
      eventCoalescing: true,
      runCoalescing: true
    }),
    provideRouter(
      routes,
      // Enable view transitions for smoother navigation
      withViewTransitions(),
      // Optimize scroll restoration
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    ),
    // Use fetch API instead of XHR for better performance
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch()
    ),
    provideClientHydration(),
    // Browser: load article payloads over HTTP. The server overrides this with a
    // filesystem loader (app.config.server.ts) so the body prerenders into HTML.
    { provide: ArticleContentLoader, useClass: HttpArticleContentLoader },
  ],
};
