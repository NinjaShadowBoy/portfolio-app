import { DOCUMENT } from '@angular/common';
import { Injectable, LOCALE_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ArticleLang } from '../interfaces/article.interface';

export const SITE_URL = 'https://www.alexabena.me';
export const AUTHOR_NAME = 'Alex Abena';

export interface SeoPage {
  title: string;
  description: string;
  /** Site-relative path without the locale prefix, e.g. `/tools`. */
  path: string;
  /** Locales this page ships in. `en` is always emitted; defaults to both. */
  langs?: readonly ArticleLang[];
  /** Extra meta tags. `og:*` / `article:*` keys become `property` tags. */
  tags?: Record<string, string | undefined>;
  /** JSON-LD structured data. `@context` and `url` are filled in. */
  jsonLd?: Record<string, unknown>;
}

/**
 * Per-page SEO head management shared by every prerendered route.
 *
 * i18n is a per-locale BUILD (en at `/`, fr at `/fr`), so canonical and
 * hreflang URLs derive from `LOCALE_ID`, never from a route param. Every
 * node this service adds carries a `data-seo` attribute so `clear()` can
 * remove the page-scoped set when a route is left. Title/Meta and the
 * DOCUMENT head are server-safe, so tags set here bake into prerendered HTML.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);
  private document = inject(DOCUMENT);

  /** The current build locale, narrowed to the site's two languages. */
  readonly lang: ArticleLang = inject(LOCALE_ID).startsWith('fr') ? 'fr' : 'en';

  /** Absolute URL of a site path in a locale (en at root, fr under /fr). */
  url(path: string, lang: ArticleLang = this.lang): string {
    return `${SITE_URL}${lang === 'fr' ? '/fr' : ''}${path}`;
  }

  /** Replace the page-scoped head nodes with this page's set. */
  setPage(page: SeoPage): void {
    const url = this.url(page.path);
    const enUrl = this.url(page.path, 'en');

    this.title.setTitle(page.title);
    this.setTags({ description: page.description, ...page.tags });

    this.clear();
    this.appendLink('canonical', { rel: 'canonical', href: url });
    this.appendLink('hreflang-en', { rel: 'alternate', hreflang: 'en', href: enUrl });
    this.appendLink('hreflang-x-default', { rel: 'alternate', hreflang: 'x-default', href: enUrl });
    if ((page.langs ?? ['en', 'fr']).includes('fr')) {
      this.appendLink('hreflang-fr', {
        rel: 'alternate',
        hreflang: 'fr',
        href: this.url(page.path, 'fr'),
      });
    }
    if (page.jsonLd) {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo', 'jsonld');
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        url,
        ...page.jsonLd,
      });
      this.document.head.appendChild(script);
    }
  }

  /** Remove every head node this service added. Call when leaving the page. */
  clear(): void {
    this.document.head.querySelectorAll('[data-seo]').forEach((node) => node.remove());
  }

  private setTags(tags: Record<string, string | undefined>): void {
    for (const [key, content] of Object.entries(tags)) {
      if (content === undefined) continue;
      const attr = /^(og|article):/.test(key) ? 'property' : 'name';
      this.meta.updateTag({ [attr]: key, content });
    }
  }

  private appendLink(key: string, attrs: Record<string, string>): void {
    const link = this.document.createElement('link');
    link.setAttribute('data-seo', key);
    for (const [name, value] of Object.entries(attrs)) {
      link.setAttribute(name, value);
    }
    this.document.head.appendChild(link);
  }
}
