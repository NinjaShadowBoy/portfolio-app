import {
  Component,
  DestroyRef,
  LOCALE_ID,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { CalculatorInputs, CostEstimate, estimateAll } from './cost-engine';
import { LLM_PRICING, PRICING_AS_OF } from './llm-pricing.data';

/**
 * A workload scenario preset: pre-filled token/cache values for a common
 * LLM use case. `cachedInputPercent` is a UI percentage (0..100); it is
 * converted to a 0..1 fraction before reaching the cost engine.
 */
interface ScenarioPreset {
  /** Stable id used for selection tracking and tests. */
  id: string;
  /** Localized label shown on the segmented-control button. */
  label: string;
  /** Average input (prompt) tokens per request. */
  avgInputTokens: number;
  /** Average output (completion) tokens per request. */
  avgOutputTokens: number;
  /** Share of input tokens billed at the cache-read rate, as a percent. */
  cachedInputPercent: number;
}

/** Debounce window (ms) for writing inputs back to the URL query string. */
const URL_SYNC_DEBOUNCE_MS = 300;

/**
 * AI API cost calculator page (routed at /tools/ai-cost-calculator).
 *
 * Fully client-side: the user describes a workload (users, request rate,
 * token counts, cached-input share) via plain numeric inputs backed by
 * signals — same pattern as the projects filters, no forms modules — and a
 * `computed` runs the pure cost engine across the static pricing table,
 * rendering all models cheapest-first.
 *
 * Shareable URLs: inputs are read ONCE from the query string at init
 * (`u`, `r`, `in`, `out`, `cache` — snapshot read, server-safe) and written
 * back debounced with `replaceUrl` — guarded to the browser platform so
 * prerendering never triggers a navigation.
 *
 * Owns its SEO the same way article-detail does: `<title>` + meta description
 * set in the constructor (baked into the prerendered HTML), canonical +
 * hreflang alternates and JSON-LD `WebApplication` structured data appended
 * to `<head>` via `data-seo`-keyed nodes, all cleaned up on destroy.
 */
@Component({
  selector: 'app-ai-cost-calculator',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './ai-cost-calculator.component.html',
  styleUrls: ['./ai-cost-calculator.component.css'],
})
export class AiCostCalculatorComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private meta = inject(Meta);
  private titleService = inject(Title);
  private document = inject(DOCUMENT);
  private locale = inject(LOCALE_ID);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  /** Absolute origin used for canonical / hreflang / JSON-LD URLs. */
  private readonly siteUrl = 'https://www.alexabena.me';

  /** Site-relative path of this page (locale prefix added separately). */
  private readonly pagePath = '/tools/ai-cost-calculator';

  /** URL path prefix for the current locale build (en at root, fr under /fr). */
  private get localePrefix(): string {
    return this.locale?.startsWith('fr') ? '/fr' : '';
  }

  /** Pricing verification date, displayed in the assumptions footer. */
  readonly pricingAsOf = PRICING_AS_OF;

  /**
   * Workload presets, in render order. The first (support chatbot) provides
   * the page's default token/cache values. Labels are localized; token
   * numbers are not (they are data, not copy).
   */
  readonly presets: readonly ScenarioPreset[] = [
    {
      id: 'support-chatbot',
      label: $localize`:@@aiCalcPresetSupportChatbot:Support chatbot`,
      avgInputTokens: 1500,
      avgOutputTokens: 300,
      cachedInputPercent: 70,
    },
    {
      id: 'rag-search',
      label: $localize`:@@aiCalcPresetRagSearch:RAG search`,
      avgInputTokens: 4000,
      avgOutputTokens: 500,
      cachedInputPercent: 30,
    },
    {
      id: 'code-assistant',
      label: $localize`:@@aiCalcPresetCodeAssistant:Code assistant`,
      avgInputTokens: 6000,
      avgOutputTokens: 1500,
      cachedInputPercent: 50,
    },
    {
      id: 'summarization',
      label: $localize`:@@aiCalcPresetSummarization:Summarization`,
      avgInputTokens: 8000,
      avgOutputTokens: 800,
      cachedInputPercent: 10,
    },
  ];

  // Workload inputs — one signal per field, defaults = support-chatbot preset
  // at 1 000 users x 10 requests/day. Query params may override these at init.
  readonly users = signal(1000);
  readonly requestsPerUserPerDay = signal(10);
  readonly avgInputTokens = signal(this.presets[0].avgInputTokens);
  readonly avgOutputTokens = signal(this.presets[0].avgOutputTokens);
  /** Cached input share as a UI percent (0..100), not a fraction. */
  readonly cachedInputPercent = signal(this.presets[0].cachedInputPercent);

  /**
   * The preset matching the current token/cache values, or null ("custom").
   * Derived rather than stored: manually editing any of the three fields
   * automatically deselects, and a query-param init that matches no preset
   * starts in the custom state — no imperative bookkeeping needed.
   */
  readonly activePresetId = computed<string | null>(() => {
    const match = this.presets.find(
      (preset) =>
        preset.avgInputTokens === this.avgInputTokens() &&
        preset.avgOutputTokens === this.avgOutputTokens() &&
        preset.cachedInputPercent === this.cachedInputPercent(),
    );
    return match?.id ?? null;
  });

  /** Engine-shaped inputs (cache percent converted to a 0..1 fraction). */
  private readonly inputs = computed<CalculatorInputs>(() => ({
    users: this.users(),
    requestsPerUserPerDay: this.requestsPerUserPerDay(),
    avgInputTokens: this.avgInputTokens(),
    avgOutputTokens: this.avgOutputTokens(),
    cachedInputShare: this.cachedInputPercent() / 100,
  }));

  /** Cost projections for every model, sorted cheapest-first by $/month. */
  readonly estimates = computed<CostEstimate[]>(() =>
    estimateAll(LLM_PRICING, this.inputs()),
  );

  /** Pending debounce timer for the URL write-back (browser only). */
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // One-shot, server-safe read of shared-scenario query params.
    this.applyQueryParams();

    // SEO tags are set once in the constructor so prerendering bakes them
    // into the static HTML; scoped head nodes are removed on destroy.
    this.setupSeo();
    this.destroyRef.onDestroy(() => this.clearSeoNodes());

    // Debounced URL write-back — browser only: prerender must never navigate.
    if (isPlatformBrowser(this.platformId)) {
      let firstRun = true;
      effect(() => {
        // Read all five signals unconditionally so the effect tracks them.
        const queryParams = {
          u: this.users(),
          r: this.requestsPerUserPerDay(),
          in: this.avgInputTokens(),
          out: this.avgOutputTokens(),
          cache: this.cachedInputPercent(),
        };
        if (firstRun) {
          // Do not rewrite the URL just for showing the defaults.
          firstRun = false;
          return;
        }
        if (this.syncTimer !== null) {
          clearTimeout(this.syncTimer);
        }
        this.syncTimer = setTimeout(() => {
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams,
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }, URL_SYNC_DEBOUNCE_MS);
      });
      this.destroyRef.onDestroy(() => {
        if (this.syncTimer !== null) {
          clearTimeout(this.syncTimer);
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // User interaction
  // ---------------------------------------------------------------------------

  /** Apply a workload preset's token/cache values (selection is derived). */
  selectPreset(preset: ScenarioPreset): void {
    this.avgInputTokens.set(preset.avgInputTokens);
    this.avgOutputTokens.set(preset.avgOutputTokens);
    this.cachedInputPercent.set(preset.cachedInputPercent);
  }

  /**
   * Parse a raw `<input>` value into a non-negative finite number.
   * Garbage collapses to 0 so the table shows $0 rows, never NaN.
   */
  protected parseNumber(raw: string): number {
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  /**
   * Compact context-window formatting: 1 000 000 -> "1M", 1 050 000 ->
   * "1.05M", 200 000 -> "200K"; null (unpublished) -> an em dash.
   * Product-scale numbers, deliberately not locale-formatted.
   */
  protected formatContext(tokens: number | null): string {
    if (tokens === null) {
      return '—';
    }
    if (tokens >= 1_000_000) {
      return `${parseFloat((tokens / 1_000_000).toFixed(2))}M`;
    }
    return `${Math.round(tokens / 1000)}K`;
  }

  // ---------------------------------------------------------------------------
  // Shareable-URL init
  // ---------------------------------------------------------------------------

  /**
   * Read scenario query params once from the route snapshot (server-safe —
   * no subscription, no navigation). Missing, malformed, negative or
   * out-of-range values are ignored silently, keeping the defaults.
   */
  private applyQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const read = (
      key: string,
      apply: (value: number) => void,
      max = Number.POSITIVE_INFINITY,
    ): void => {
      const raw = params.get(key);
      if (raw === null || raw.trim() === '') {
        return;
      }
      const value = Number(raw);
      if (Number.isFinite(value) && value >= 0 && value <= max) {
        apply(value);
      }
    };
    read('u', (v) => this.users.set(v));
    read('r', (v) => this.requestsPerUserPerDay.set(v));
    read('in', (v) => this.avgInputTokens.set(v));
    read('out', (v) => this.avgOutputTokens.set(v));
    read('cache', (v) => this.cachedInputPercent.set(v), 100);
  }

  // ---------------------------------------------------------------------------
  // SEO
  // ---------------------------------------------------------------------------

  private setupSeo(): void {
    const url = `${this.siteUrl}${this.localePrefix}${this.pagePath}`;
    const title = $localize`:@@aiCalcSeoTitle:AI API Cost Calculator - Compare 18 LLM Prices · Alex Abena`;
    const description = $localize`:@@aiCalcSeoDescription:Free calculator comparing OpenAI, Anthropic, Google, DeepSeek, Mistral and xAI API prices. Estimate your monthly LLM cost from real workload numbers.`;

    this.titleService.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });

    this.setCanonical(url);
    this.setHreflang();
    this.setJsonLd(url, description);
  }

  /** Self-referential canonical for the current locale build. */
  private setCanonical(url: string): void {
    this.upsertLink('canonical', { rel: 'canonical', href: url });
  }

  /** hreflang alternates: en (root), fr (under /fr), x-default -> en. */
  private setHreflang(): void {
    this.removeSeoNodes('link[data-seo^="hreflang-"]');

    const enUrl = `${this.siteUrl}${this.pagePath}`;
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
      href: `${this.siteUrl}/fr${this.pagePath}`,
    });
  }

  /** JSON-LD `WebApplication` structured data (free developer tool). */
  private setJsonLd(url: string, description: string): void {
    const data: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: $localize`:@@aiCalcAppName:AI API Cost Calculator`,
      description,
      url,
      applicationCategory: 'DeveloperApplication',
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    };

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

  private clearSeoNodes(): void {
    this.removeSeoNodes(
      'link[data-seo="canonical"], link[data-seo^="hreflang-"], script[data-seo="jsonld"]',
    );
  }
}
