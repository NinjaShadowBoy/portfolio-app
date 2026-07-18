import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ArticleLang, ArticlePayload } from '../interfaces/article.interface';

/**
 * Loads a single rendered article payload (`<slug>.<lang>.json`) for a given
 * locale. Swapped by platform via DI so the same `ArticleDataService` code path
 * renders the body on both sides:
 *  - Browser: fetched over HTTP from `/assets/articles/...` (keeps the payloads
 *    out of the initial JS bundle — they load per route on client navigation).
 *  - Server: read from the build-generated files on disk during prerender, so the
 *    body is baked into the static HTML for SEO (see `*.server.ts`). A blocking
 *    HTTP fetch during prerender would hang on an asset the static render can't
 *    serve, which is exactly why the loader is platform-specific.
 */
export abstract class ArticleContentLoader {
  abstract load(slug: string, lang: ArticleLang): Observable<ArticlePayload | null>;
}

/** Default (browser) loader: fetch the payload asset over HTTP. */
@Injectable()
export class HttpArticleContentLoader extends ArticleContentLoader {
  private http = inject(HttpClient);

  load(slug: string, lang: ArticleLang): Observable<ArticlePayload | null> {
    return this.http
      .get<ArticlePayload>(`/assets/articles/${slug}.${lang}.json`)
      .pipe(catchError(() => of(null)));
  }
}
