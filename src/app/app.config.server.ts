import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { ArticleContentLoader } from './core/services/article-content-loader';
import { ServerArticleContentLoader } from './core/services/article-content-loader.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Override the browser HTTP loader: read payloads from disk during prerender
    // so the rendered body is baked into the static HTML (merged last -> wins).
    { provide: ArticleContentLoader, useClass: ServerArticleContentLoader },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
