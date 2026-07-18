import {
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title, DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  ArticleLang,
  ArticlePayload,
  ArticleSummary,
  TocNode,
} from '../../core/interfaces/article.interface';
import { ArticleDataService } from '../../core/services/article-data.service';
import { LazyLoadDirective } from '../../core/directives/lazy-load.directive';
import { CodeCopyDirective } from '../../core/directives/code-copy.directive';
import { TocComponent } from '../../shared/ui/toc/toc.component';
import { ConnectionsComponent } from '../../shared/ui/connections/connections.component';
import { FeedbackComponent } from '../../shared/ui/feedback/feedback.component';

/**
 * Article detail page.
 *
 * Reads the `:slug` route param reactively and derives the manifest summary
 * (synchronous, build-imported) plus the rendered payload (HTML body + TOC,
 * fetched from `/assets/articles/<slug>.<lang>.json` for SPA transitions; the
 * prerendered HTML already carries the body on first paint).
 *
 * Owns per-article SEO: `<title>`, meta description, canonical, Open Graph +
 * Twitter Card tags, JSON-LD `Article` structured data, and `hreflang` alternate
 * links. i18n is a per-locale BUILD (en at `/`, fr at `/fr`) — there is no
 * `:lang` route param, so the alternate/canonical URLs are built from
 * `LOCALE_ID` + the slug, not from a route segment.
 */
@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [
    CommonModule,
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
  private route = inject(ActivatedRoute);
  private articleData = inject(ArticleDataService);
  private meta = inject(Meta);
  private titleService = inject(Title);
  private sanitizer = inject(DomSanitizer);
  private document = inject(DOCUMENT);
  private locale = inject(LOCALE_ID);
  private destroyRef = inject(DestroyRef);

  /** Absolute origin used for canonical / OG / hreflang URLs. */
  private readonly siteUrl = 'https://www.alexabena.me';

  /** Author name emitted in JSON-LD + the page title suffix. */
  private readonly authorName = 'Alex Abena';

  /** The current build locale, narrowed to the writing-system langs. */
  private get lang(): ArticleLang {
    return this.locale?.startsWith('fr') ? 'fr' : 'en';
  }

  /** URL path prefix for the current locale (en at root, fr under /fr). */
  private get localePrefix(): string {
    return this.lang === 'fr' ? '/fr' : '';
  }

  /** The `:slug` route param, read reactively. */
  readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug'))),
    { initialValue: null },
  );

  /** The manifest summary for the current slug (undefined => not found). */
  readonly summary = computed<ArticleSummary | undefined>(() => {
    const slug = this.slug();
    return slug ? this.articleData.getArticleSummary(slug) : undefined;
  });

  /**
   * The rendered payload for the current slug + locale. Fetched for client
   * transitions; the prerendered HTML covers first paint. Errors degrade to
   * `null` (the prerendered body still shows) rather than throwing.
   */
  readonly payload = toSignal<ArticlePayload | null>(
    toObservable(this.slug).pipe(
      switchMap((slug) =>
        // Loaded on both platforms: the server reads the payload from disk during
        // prerender (body baked into static HTML for SEO), the browser fetches it
        // over HTTP on client navigation.
        slug
          ? this.articleData
              .getArticle(slug, this.lang)
              .pipe(catchError(() => of(null)))
          : of(null),
      ),
    ),
    { initialValue: null },
  );

  /** The Shiki-highlighted body, trusted (build-generated from our own content). */
  readonly bodyHtml = computed<SafeHtml>(() => {
    const html = this.payload()?.html;
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : '';
  });

  /** The table-of-contents tree for the current article. */
  readonly toc = computed<TocNode[]>(() => this.payload()?.toc ?? []);

  /** True when a requested translation is missing and the en body is served. */
  readonly notTranslated = computed<boolean>(
    () => this.payload()?.notTranslated ?? false,
  );

  /**
   * Cover image resolved to a servable URL. Manifest cover paths are relative to
   * the article's slug folder; absolute paths and full URLs are used as-is.
   */
  readonly coverImageUrl = computed<string | undefined>(() => {
    const article = this.summary();
    return article ? this.resolveCover(article) : undefined;
  });

  constructor() {
    // Keep SEO tags in sync with the resolved article. Runs during SSR/prerender
    // (Meta/Title + DOCUMENT head are server-safe), baking the tags into the
    // static HTML, and re-runs on client navigation between articles.
    effect(() => {
      const article = this.summary();
      if (article) {
        this.updateSeo(article);
      }
    });

    // Clean the article-scoped SEO nodes when leaving the page so a subsequent
    // non-article route does not inherit stale canonical/hreflang/JSON-LD tags.
    this.destroyRef.onDestroy(() => this.clearSeoLinks());
  }

  // ---------------------------------------------------------------------------
  // SEO
  // ---------------------------------------------------------------------------

  private updateSeo(article: ArticleSummary): void {
    const url = this.canonicalUrl(article.slug);
    const title = article.title;
    const description = article.description;
    const image = this.absoluteCoverUrl(article);

    this.titleService.setTitle(`${title} · ${this.authorName}`);
    this.meta.updateTag({ name: 'description', content: description });

    // Open Graph
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({
      property: 'article:published_time',
      content: article.date,
    });
    if (article.updated) {
      this.meta.updateTag({
        property: 'article:modified_time',
        content: article.updated,
      });
    }
    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
    }

    // Twitter Card
    this.meta.updateTag({
      name: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary',
    });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    if (image) {
      this.meta.updateTag({ name: 'twitter:image', content: image });
    }

    this.setCanonical(url);
    this.setHreflang(article);
    this.setJsonLd(article, url, image);
  }

  /** Self-referential canonical for the current locale. */
  private canonicalUrl(slug: string): string {
    return `${this.siteUrl}${this.localePrefix}/articles/${slug}`;
  }

  private setCanonical(url: string): void {
    this.upsertLink('canonical', { rel: 'canonical', href: url });
  }

  /**
   * hreflang alternates. en (root) always exists; fr is emitted only when the
   * article actually ships a French translation; x-default points at en.
   */
  private setHreflang(article: ArticleSummary): void {
    this.removeSeoNodes('link[data-seo^="hreflang-"]');

    const enUrl = `${this.siteUrl}/articles/${article.slug}`;
    this.appendLink('hreflang-en', {
      rel: 'alternate',
      hreflang: 'en',
      href: enUrl,
    });
    this.appendLink('hreflang-x-default', {
      rel: 'alternate',
      hreflang: 'x-default',
      href: enUrl,
    });
    if (article.langs.includes('fr')) {
      this.appendLink('hreflang-fr', {
        rel: 'alternate',
        hreflang: 'fr',
        href: `${this.siteUrl}/fr/articles/${article.slug}`,
      });
    }
  }

  private setJsonLd(
    article: ArticleSummary,
    url: string,
    image: string | undefined,
  ): void {
    const data: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.date,
      dateModified: article.updated ?? article.date,
      inLanguage: this.lang,
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: { '@type': 'Person', name: this.authorName },
    };
    if (image) {
      data['image'] = image;
    }
    if (article.tags.length > 0) {
      data['keywords'] = article.tags.join(', ');
    }

    const head = this.document.head;
    let script = head.querySelector<HTMLScriptElement>(
      'script[data-seo="jsonld"]',
    );
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo', 'jsonld');
      head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  /** Insert-or-update a single-instance head <link> keyed by data-seo. */
  private upsertLink(key: string, attrs: Record<string, string>): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>(`link[data-seo="${key}"]`);
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('data-seo', key);
      head.appendChild(link);
    }
    for (const [name, value] of Object.entries(attrs)) {
      link.setAttribute(name, value);
    }
  }

  /** Append a fresh head <link> (used for the multi-instance hreflang set). */
  private appendLink(key: string, attrs: Record<string, string>): void {
    const link = this.document.createElement('link');
    link.setAttribute('data-seo', key);
    for (const [name, value] of Object.entries(attrs)) {
      link.setAttribute(name, value);
    }
    this.document.head.appendChild(link);
  }

  private removeSeoNodes(selector: string): void {
    this.document.head
      .querySelectorAll(selector)
      .forEach((node) => node.remove());
  }

  private clearSeoLinks(): void {
    this.removeSeoNodes(
      'link[data-seo="canonical"], link[data-seo^="hreflang-"], script[data-seo="jsonld"]',
    );
  }

  // ---------------------------------------------------------------------------
  // Cover image resolution
  // ---------------------------------------------------------------------------

  private resolveCover(article: ArticleSummary): string | undefined {
    const cover = article.coverImage;
    if (!cover) {
      return undefined;
    }
    if (/^(https?:)?\/\//.test(cover) || cover.startsWith('/')) {
      return cover;
    }
    return `/assets/articles/${article.slug}/${cover}`;
  }

  private absoluteCoverUrl(article: ArticleSummary): string | undefined {
    const cover = this.resolveCover(article);
    if (!cover) {
      return undefined;
    }
    if (/^https?:\/\//.test(cover)) {
      return cover;
    }
    return `${this.siteUrl}${cover.startsWith('/') ? '' : '/'}${cover}`;
  }
}
