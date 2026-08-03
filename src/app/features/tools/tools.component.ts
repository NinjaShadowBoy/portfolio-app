import { Component, DestroyRef, LOCALE_ID, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { PRICING_AS_OF } from './ai-cost-calculator/llm-pricing.data';

/**
 * Tools index page — the `/tools` landing that lists the site's free,
 * client-side developer tools. Currently a single card linking to the
 * AI cost calculator; the grid is ready for future tools.
 *
 * Owns its own SEO the same way {@link ArticleDetailComponent} does:
 * `<title>` + meta description set in the constructor (server-safe, so the
 * tags are baked into the prerendered HTML), canonical + hreflang alternate
 * `<link>`s keyed by `data-seo` attributes, and cleanup in
 * `DestroyRef.onDestroy` so later routes never inherit stale head nodes.
 * i18n is a per-locale BUILD (en at `/`, fr at `/fr`) — there is no `:lang`
 * route param, so alternate/canonical URLs derive from `LOCALE_ID`.
 */
@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tools.component.html',
  styleUrls: ['./tools.component.css'],
})
export class ToolsComponent {
  private meta = inject(Meta);
  private titleService = inject(Title);
  private document = inject(DOCUMENT);
  private locale = inject(LOCALE_ID);
  private destroyRef = inject(DestroyRef);

  /** Absolute origin used for canonical / hreflang URLs. */
  private readonly siteUrl = 'https://www.alexabena.me';

  /** URL path prefix for the current locale (en at root, fr under /fr). */
  private get localePrefix(): string {
    return this.locale?.startsWith('fr') ? '/fr' : '';
  }

  /**
   * Date the pricing table was last verified against official pricing pages —
   * surfaced on the calculator card so stale data is self-disclosing.
   * A date string, not localized (matches the `PRICING_AS_OF` contract).
   */
  readonly pricingAsOf = PRICING_AS_OF;

  constructor() {
    // The page is fully static, so SEO is set once in the constructor. This
    // runs during SSR/prerender too (Title/Meta + DOCUMENT head are
    // server-safe), baking the tags into the static HTML.
    this.setSeo();

    // Remove the page-scoped head nodes on leave so a subsequent route does
    // not inherit a stale canonical/hreflang set.
    this.destroyRef.onDestroy(() => this.clearSeoLinks());
  }

  // ---------------------------------------------------------------------------
  // SEO
  // ---------------------------------------------------------------------------

  private setSeo(): void {
    const url = `${this.siteUrl}${this.localePrefix}/tools`;

    this.titleService.setTitle(
      $localize`:@@toolsSeoTitle:Developer Tools · Alex Abena`,
    );
    this.meta.updateTag({
      name: 'description',
      content: $localize`:@@toolsSeoDescription:Free developer tools that run in your browser. Compare LLM API pricing across OpenAI, Anthropic, Google and four other providers with the AI cost calculator.`,
    });

    this.upsertLink('canonical', { rel: 'canonical', href: url });
    this.setHreflang();
  }

  /**
   * hreflang alternates. Unlike articles, both locales always exist for
   * `/tools` (per-locale builds prerender every static route), so en, fr,
   * and x-default (pointing at en) are all emitted unconditionally.
   */
  private setHreflang(): void {
    this.removeSeoNodes('link[data-seo^="hreflang-"]');

    const enUrl = `${this.siteUrl}/tools`;
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
    this.appendLink('hreflang-fr', {
      rel: 'alternate',
      hreflang: 'fr',
      href: `${this.siteUrl}/fr/tools`,
    });
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
      'link[data-seo="canonical"], link[data-seo^="hreflang-"]',
    );
  }
}
