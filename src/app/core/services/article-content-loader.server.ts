import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArticleLang, ArticlePayload } from '../interfaces/article.interface';
import { ArticleContentLoader } from './article-content-loader';

/**
 * Server-side article content loader (provided only in `app.config.server.ts`, so
 * `node:fs` never reaches the browser bundle). Reads the build-generated payload
 * synchronously from disk so the rendered body is present during prerender and
 * baked into the static HTML.
 *
 * Article routes are all `RenderMode.Prerender`, so this only ever runs at build
 * time, where the working directory is the app root and the generated files live
 * at `src/generated/articles/<slug>.<lang>.json`.
 */
@Injectable()
export class ServerArticleContentLoader extends ArticleContentLoader {
  load(slug: string, lang: ArticleLang): Observable<ArticlePayload | null> {
    try {
      const file = join(
        process.cwd(),
        'src',
        'generated',
        'articles',
        `${slug}.${lang}.json`,
      );
      const payload = JSON.parse(readFileSync(file, 'utf8')) as ArticlePayload;
      return of(payload);
    } catch {
      return of(null);
    }
  }
}
