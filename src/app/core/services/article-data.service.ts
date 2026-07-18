import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { articlesManifest } from '../../../generated/articles-manifest';
import {
  ArticleLang,
  ArticlePayload,
  ArticleSummary,
} from '../interfaces/article.interface';
import { ArticleContentLoader } from './article-content-loader';

/**
 * Reads the build-generated article manifest and per-article payloads.
 *
 * The manifest is a build-time TypeScript module (`src/generated/articles-manifest.ts`,
 * emitted by `scripts/build-content.mjs`), so it is imported statically rather
 * than fetched — no HTTP, no loading state, always present at first paint. The
 * rendered payloads are static JSON served from `/assets/articles/<slug>.<lang>.json`
 * and fetched only for SPA client transitions (prerendered HTML covers first paint).
 *
 * Mirrors ProjectDataService (root-provided, `inject(HttpClient)`, signals). No
 * `withCredentials` is set: payloads are static assets, not authenticated API calls,
 * and the URL is not under `environment.apiBaseUrl` so the auth interceptor never
 * touches it.
 */
@Injectable({
  providedIn: 'root',
})
export class ArticleDataService {
  /** Platform-swapped: HTTP in the browser, filesystem on the server (prerender). */
  private loader = inject(ArticleContentLoader);

  /** The manifest is build-imported; drafts are already excluded at build. */
  private readonly manifestSignal = signal<ArticleSummary[]>(articlesManifest);

  /** All published article summaries (manifest rows), newest-first as emitted. */
  public readonly articles = computed(() => this.manifestSignal());

  /**
   * Look up a single manifest row by slug. Returns `undefined` for unknown or
   * draft slugs (drafts are absent from the manifest).
   */
  getArticleSummary(slug: string): ArticleSummary | undefined {
    return this.articles().find((article) => article.slug === slug);
  }

  /**
   * Fetch the rendered payload for an article in a given locale.
   *
   * Graceful missing-translation fallback (consistent with the build): if the
   * requested locale is not among the article's available `langs`, the English
   * payload is served instead and flagged `notTranslated` so the detail page can
   * render a "not yet translated" notice rather than 404.
   */
  getArticle(slug: string, lang: ArticleLang): Observable<ArticlePayload | null> {
    const summary = this.getArticleSummary(slug);
    const hasRequestedLang = summary?.langs.includes(lang) ?? false;
    const servedLang: ArticleLang = hasRequestedLang ? lang : 'en';
    const fellBack = servedLang !== lang;

    return this.loader.load(slug, servedLang).pipe(
      map((payload) =>
        payload
          ? {
              ...payload,
              lang: servedLang,
              notTranslated: payload.notTranslated || fellBack,
            }
          : null,
      ),
    );
  }
}
