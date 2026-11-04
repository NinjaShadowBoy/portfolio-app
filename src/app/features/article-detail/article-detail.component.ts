import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { ArticlePayload, ArticleSummary } from '../../core/interfaces/article.interface';
import { ArticleDataService } from '../../core/services/article-data.service';
import { AUTHOR_NAME, SITE_URL, SeoService } from '../../core/services/seo.service';
import { resolveCoverImage } from '../../core/utils/article-cover';
import { LazyLoadDirective } from '../../core/directives/lazy-load.directive';
import { CodeCopyDirective } from '../../core/directives/code-copy.directive';
import { TocComponent } from '../../shared/ui/toc/toc.component';
import { ConnectionsComponent } from '../../shared/ui/connections/connections.component';
import { FeedbackComponent } from '../../shared/ui/feedback/feedback.component';

/**
 * Article detail page. Reads the `:slug` route param reactively and derives
 * the manifest summary (synchronous, build-imported) plus the rendered payload
 * (HTML body + TOC). The payload is fetched for SPA transitions; prerendered
 * HTML already carries the body on first paint. Per-article SEO (Open Graph,
 * Twitter Card, JSON-LD Article, canonical, hreflang) goes through SeoService.
 */
@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [
    DatePipe,
    LazyLoadDirective,
    CodeCopyDirective,
    TocComponent,
    ConnectionsComponent,
    FeedbackComponent,
  ],
  templateUrl: './article-detail.component.html',
  styleUrls: ['./article-detail.component.css'],
})
export class ArticleDetailComponent {
  private articleData = inject(ArticleDataService);
  private seo = inject(SeoService);
  private sanitizer = inject(DomSanitizer);

  readonly slug = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('slug'))), {
    initialValue: null,
  });

  /** The manifest summary for the current slug (undefined => not found). */
  readonly summary = computed<ArticleSummary | undefined>(() => {
    const slug = this.slug();
    return slug ? this.articleData.getArticleSummary(slug) : undefined;
  });

  /** Rendered payload for the current slug + locale; errors degrade to null. */
  readonly payload = toSignal<ArticlePayload | null>(
    toObservable(this.slug).pipe(
      switchMap((slug) =>
        slug ? this.articleData.getArticle(slug, this.seo.lang).pipe(catchError(() => of(null))) : of(null)
      )
    ),
    { initialValue: null }
  );

  /** The Shiki-highlighted body, trusted: it is build-generated from our own content. */
  readonly bodyHtml = computed<SafeHtml>(() => {
    const html = this.payload()?.html;
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : '';
  });

  readonly toc = computed(() => this.payload()?.toc ?? []);
  readonly notTranslated = computed(() => this.payload()?.notTranslated ?? false);

  readonly coverImageUrl = computed(() => {
    const article = this.summary();
    return article && resolveCoverImage(article);
  });

  constructor() {
    // Runs during SSR/prerender too, baking the tags into the static HTML.
    effect(() => {
      const article = this.summary();
      if (article) this.updateSeo(article);
    });
    inject(DestroyRef).onDestroy(() => this.seo.clear());
  }

  private updateSeo(article: ArticleSummary): void {
    const cover = resolveCoverImage(article);
    const image = cover && (/^https?:\/\//.test(cover) ? cover : `${SITE_URL}${cover}`);

    this.seo.setPage({
      title: `${article.title} · ${AUTHOR_NAME}`,
      description: article.description,
      path: `/articles/${article.slug}`,
      langs: article.langs,
      tags: {
        'og:type': 'article',
        'og:title': article.title,
        'og:description': article.description,
        'og:url': this.seo.url(`/articles/${article.slug}`),
        'og:image': image,
        'article:published_time': article.date,
        'article:modified_time': article.updated,
        'twitter:card': image ? 'summary_large_image' : 'summary',
        'twitter:title': article.title,
        'twitter:description': article.description,
        'twitter:image': image,
      },
      jsonLd: {
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        datePublished: article.date,
        dateModified: article.updated ?? article.date,
        inLanguage: this.seo.lang,
        mainEntityOfPage: { '@type': 'WebPage', '@id': this.seo.url(`/articles/${article.slug}`) },
        author: { '@type': 'Person', name: AUTHOR_NAME },
        ...(image && { image }),
        ...(article.tags.length > 0 && { keywords: article.tags.join(', ') }),
      },
    });
  }
}
