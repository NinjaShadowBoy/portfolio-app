import { ApplicationConfig } from '@angular/core';
import { TitleStrategy, provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { AppTitleStrategy } from './core/services/app-title-strategy';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { serverApiTimeoutInterceptor } from './core/interceptors/server-api-timeout.interceptor';
import { provideClientHydration } from '@angular/platform-browser';
import {
  ArticleContentLoader,
  HttpArticleContentLoader,
} from './core/services/article-content-loader';

export const appConfig: ApplicationConfig = {
  providers: [
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
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideHttpClient(withInterceptors([authInterceptor, serverApiTimeoutInterceptor])),
    provideClientHydration(),
    // Browser: load article payloads over HTTP. The server overrides this with a
    // filesystem loader (app.config.server.ts) so the body prerenders into HTML.
    { provide: ArticleContentLoader, useClass: HttpArticleContentLoader },
  ],
};
