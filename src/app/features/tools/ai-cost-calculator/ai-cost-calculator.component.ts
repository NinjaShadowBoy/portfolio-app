import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';
import { CalculatorInputs, CostEstimate, estimateAll } from './cost-engine';
import { LLM_PRICING, PRICING_AS_OF } from './llm-pricing.data';
import {
  SegmentedToggleComponent,
  SegmentedToggleOption,
} from '../../../shared/ui/segmented-toggle/segmented-toggle.component';

/**
 * A workload scenario preset. `cachedInputPercent` is a UI percentage
 * (0..100); it becomes a 0..1 fraction before reaching the cost engine.
 */
interface ScenarioPreset {
  id: string;
  label: string;
  avgInputTokens: number;
  avgOutputTokens: number;
  cachedInputPercent: number;
}

/** Debounce window (ms) for writing inputs back to the URL query string. */
const URL_SYNC_DEBOUNCE_MS = 300;

const PAGE_PATH = '/tools/ai-cost-calculator';

/**
 * AI API cost calculator (routed at /tools/ai-cost-calculator).
 *
 * Fully client-side: signal-backed numeric inputs feed a `computed` that runs
 * the pure cost engine across the static pricing table, cheapest-first.
 *
 * Shareable URLs: inputs are read ONCE from the query string at init
 * (`u`, `r`, `in`, `out`, `cache`; a snapshot read, server-safe) and written
 * back debounced via `Location.replaceState` rather than a router navigation,
 * which would scroll the page to the top. Browser only, so prerendering never
 * touches the URL.
 */
@Component({
  selector: 'app-ai-cost-calculator',
  imports: [DecimalPipe, SegmentedToggleComponent],
  templateUrl: './ai-cost-calculator.component.html',
  styleUrl: './ai-cost-calculator.component.css',
})
export class AiCostCalculatorComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private seo = inject(SeoService);
  private destroyRef = inject(DestroyRef);

  readonly pricingAsOf = PRICING_AS_OF;

  /** Workload presets, in render order. The first provides the default values. */
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

  readonly presetOptions: readonly SegmentedToggleOption[] = this.presets.map(
    ({ id, label }) => ({ value: id, label })
  );

  // Workload inputs: defaults are the first preset at 1 000 users x 10 requests/day.
  readonly users = signal(1000);
  readonly requestsPerUserPerDay = signal(10);
  readonly avgInputTokens = signal(this.presets[0].avgInputTokens);
  readonly avgOutputTokens = signal(this.presets[0].avgOutputTokens);
  readonly cachedInputPercent = signal(this.presets[0].cachedInputPercent);

  /**
   * The preset matching the current token/cache values, or null ("custom").
   * Derived rather than stored, so a manual edit deselects automatically.
   */
  readonly activePresetId = computed<string | null>(
    () =>
      this.presets.find(
        (preset) =>
          preset.avgInputTokens === this.avgInputTokens() &&
          preset.avgOutputTokens === this.avgOutputTokens() &&
          preset.cachedInputPercent === this.cachedInputPercent()
      )?.id ?? null
  );

  private readonly inputs = computed<CalculatorInputs>(() => ({
    users: this.users(),
    requestsPerUserPerDay: this.requestsPerUserPerDay(),
    avgInputTokens: this.avgInputTokens(),
    avgOutputTokens: this.avgOutputTokens(),
    cachedInputShare: this.cachedInputPercent() / 100,
  }));

  /** Cost projections for every model, sorted cheapest-first by $/month. */
  readonly estimates = computed<CostEstimate[]>(() => estimateAll(LLM_PRICING, this.inputs()));

  constructor() {
    this.applyQueryParams();
    this.setupSeo();
    if (isPlatformBrowser(inject(PLATFORM_ID))) this.syncUrl();
  }

  /** Segmented-toggle handler: apply a preset's token/cache values. */
  selectPresetById(id: string): void {
    const preset = this.presets.find((candidate) => candidate.id === id);
    if (!preset) return;
    this.avgInputTokens.set(preset.avgInputTokens);
    this.avgOutputTokens.set(preset.avgOutputTokens);
    this.cachedInputPercent.set(preset.cachedInputPercent);
  }

  /** Parse a raw `<input>` value; garbage collapses to 0 so the table never shows NaN. */
  protected parseNumber(raw: string): number {
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  /** 1 000 000 -> "1M", 1 050 000 -> "1.05M", 200 000 -> "200K"; null -> an em dash. */
  protected formatContext(tokens: number | null): string {
    if (tokens === null) return '—';
    if (tokens >= 1_000_000) return `${parseFloat((tokens / 1_000_000).toFixed(2))}M`;
    return `${Math.round(tokens / 1000)}K`;
  }

  /** One-shot read of shared-scenario query params; invalid values keep the defaults. */
  private applyQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const read = (key: string, target: { set(value: number): void }, max = Infinity) => {
      const raw = params.get(key);
      if (raw === null || raw.trim() === '') return;
      const value = Number(raw);
      if (Number.isFinite(value) && value >= 0 && value <= max) target.set(value);
    };
    read('u', this.users);
    read('r', this.requestsPerUserPerDay);
    read('in', this.avgInputTokens);
    read('out', this.avgOutputTokens);
    read('cache', this.cachedInputPercent, 100);
  }

  /** Debounced URL write-back so the current scenario is shareable. */
  private syncUrl(): void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let firstRun = true;
    effect(() => {
      const queryParams = {
        u: this.users(),
        r: this.requestsPerUserPerDay(),
        in: this.avgInputTokens(),
        out: this.avgOutputTokens(),
        cache: this.cachedInputPercent(),
      };
      if (firstRun) {
        firstRun = false; // Do not rewrite the URL just for showing the defaults.
        return;
      }
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        const tree = this.router.createUrlTree([], {
          relativeTo: this.route,
          queryParams,
          queryParamsHandling: 'merge',
        });
        this.location.replaceState(this.router.serializeUrl(tree));
      }, URL_SYNC_DEBOUNCE_MS);
    });
    this.destroyRef.onDestroy(() => {
      if (timer !== null) clearTimeout(timer);
    });
  }

  private setupSeo(): void {
    const description = $localize`:@@aiCalcSeoDescription:Free calculator comparing OpenAI, Anthropic, Google, DeepSeek, Mistral and xAI API prices. Estimate your monthly LLM cost from real workload numbers.`;
    this.seo.setPage({
      title: $localize`:@@aiCalcSeoTitle:AI API Cost Calculator - Compare 18 LLM Prices · Alex Abena`,
      description,
      path: PAGE_PATH,
      jsonLd: {
        '@type': 'WebApplication',
        name: $localize`:@@aiCalcAppName:AI API Cost Calculator`,
        description,
        applicationCategory: 'DeveloperApplication',
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
      },
    });
    this.destroyRef.onDestroy(() => this.seo.clear());
  }
}
