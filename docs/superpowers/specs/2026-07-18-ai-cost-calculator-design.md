# AI/LLM Cost Calculator — Design

**Date:** 2026-07-18
**Status:** Approved (user delegated judgment: "go on with the engine 2 in ultracode")
**Engine #2** of the audience-building strategy (see `2026-07-17-technical-writing-system-design.md` for engine #1 and the overall direction).

## Purpose

A free, client-side tool that answers "what will my AI feature cost per month?" for
developers comparing LLM APIs. It is the portfolio's flagship recurring-traffic magnet:
shareable (URL-encoded scenarios), SEO-indexable (prerendered static HTML), and honest
(official per-provider pricing with sources and a visible "prices as of" date).

## Scope (v1)

- New public **/tools** section: a tools index page and **/tools/ai-cost-calculator**.
- Fully client-side: no backend, no API calls at runtime. Pricing is a static, typed
  TypeScript table checked into the repo.
- Bilingual (en/fr) like the rest of the site — per-locale builds, no `/:lang` route param.
- Both routes prerendered (`RenderMode.Prerender`), added to the sitemap.
- The dormant "Tools" nav slot (header desktop + mobile) goes live; the footer Quick
  Links gains Tools and Articles links (Articles was missing there — consistency fix).

**Out of scope for v1** (deliberate):
- Structured feedback on tool pages — the backend comment target is an XOR of
  project/article; extending it is a separate backend change. Revisit in v2.
- Cache-*write* premiums, batch discounts, long-context surcharge tiers, per-hour cache
  storage — modeled as footnotes/notes, not math. The calculator states its assumptions.
- Currency selection (USD only), token-counting helpers, provider API integrations.

## Architecture

```
src/app/features/tools/
├── tools.component.{ts,html,css,spec.ts}          # /tools index page
└── ai-cost-calculator/
    ├── llm-pricing.data.ts                        # static pricing table + PRICING_AS_OF
    ├── cost-engine.ts                             # pure math, no Angular imports
    ├── cost-engine.spec.ts                        # unit tests for the math
    └── ai-cost-calculator.component.{ts,html,css,spec.ts}
```

### Pricing data (`llm-pricing.data.ts`)

```ts
export interface LlmModelPricing {
  id: string;             // stable slug, e.g. 'claude-sonnet-5'
  provider: string;       // 'OpenAI' | 'Anthropic' | 'Google' | 'DeepSeek' | 'Mistral' | 'xAI' | 'Groq'
  name: string;           // display name, NOT localized (product names)
  inputPerMTok: number;   // USD per 1M input tokens (standard, non-batch, base tier)
  outputPerMTok: number;  // USD per 1M output tokens
  cacheReadPerMTok: number | null;  // null => provider publishes no flat cache-read rate
  contextWindow: number | null;     // tokens, null if not published
  sourceUrl: string;      // official pricing page
  note?: string;          // short caveat surfaced in the UI (e.g. intro pricing, >200K surcharge)
}
export const PRICING_AS_OF = '2026-07-18';
export const LLM_PRICING: LlmModelPricing[] = [/* 17 models */];
```

17 models (researched 2026-07-18 from official pricing pages): OpenAI GPT-5.6
Sol/Terra/Luna + GPT-5.4 mini; Anthropic Claude Fable 5 / Opus 4.8 / Sonnet 5 (intro
price, note) / Haiku 4.5; Google Gemini 3.1 Pro (note: 2x above 200K) / 3.5 Flash /
3.1 Flash-Lite; DeepSeek v4-pro / v4-flash; Mistral Medium 3.5 / Small 4; xAI Grok 4.5
/ 4.3 (notes: 2x above 200K); Llama 3.3 70B on Groq. **Mistral Large 3 is excluded**:
Mistral's own pages publish two conflicting prices ($0.50/$1.50 vs $2/$6); accuracy
outranks coverage.

Prices are manually refreshed; `PRICING_AS_OF` is displayed prominently in the UI with
per-model source links so stale data is self-disclosing.

### Cost engine (`cost-engine.ts`)

Pure functions, no Angular dependency, unit-tested in isolation.

```ts
export interface CalculatorInputs {
  users: number;                // monthly active users
  requestsPerUserPerDay: number;
  avgInputTokens: number;       // per request
  avgOutputTokens: number;      // per request
  cachedInputShare: number;     // 0..1 — fraction of input tokens billed at cache-read rate
}
export interface CostEstimate {
  model: LlmModelPricing;
  costPerRequest: number;       // USD
  costPerDay: number;
  costPerMonth: number;         // 30-day month (stated assumption)
  costPerUserPerMonth: number;
}
export function estimateCost(model: LlmModelPricing, inputs: CalculatorInputs): CostEstimate;
export function estimateAll(models: LlmModelPricing[], inputs: CalculatorInputs): CostEstimate[]; // sorted by costPerMonth asc
```

Math (per request):
- `effectiveInputRate = (1 - c) * inputPerMTok + c * (cacheReadPerMTok ?? inputPerMTok)`
  — models without a published cache-read rate bill the cached share at full input
  price (conservative; footnoted in the UI).
- `costPerRequest = (avgInputTokens * effectiveInputRate + avgOutputTokens * outputPerMTok) / 1e6`
- `requestsPerDay = users * requestsPerUserPerDay`; month = 30 days.
- All inputs clamped to `>= 0`; NaN treated as 0.

### Calculator page (`ai-cost-calculator.component`)

Signal-based, matching the projects-filter pattern (plain inputs + signals, no
ReactiveForms). Layout:

1. **Scenario presets** — a `.segmented-control` (reusing the global class) with
   workload presets that set `avgInputTokens` / `avgOutputTokens` / `cachedInputShare`:
   - Support chatbot: 1 500 in / 300 out / 70 % cached
   - RAG search: 4 000 in / 500 out / 30 % cached
   - Code assistant: 6 000 in / 1 500 out / 50 % cached
   - Summarization: 8 000 in / 800 out / 10 % cached
   Editing any of those three fields deselects the preset ("custom").
2. **Inputs** — users (default 1 000), requests/user/day (default 10), input tokens,
   output tokens, cached-input share (%). Numeric inputs styled like the projects
   filters (`.filter-group` pattern, component-scoped CSS using design tokens only).
3. **Results table** — ALL models, sorted cheapest-first by monthly cost; columns:
   Provider, Model (with `note` surfaced), Context, $/request, $/day, $/month,
   $/user/month. Cheapest row visually highlighted (token-based accent). Model names
   link to `sourceUrl`. Numbers formatted with Angular's locale-aware `DecimalPipe`.
4. **Assumptions footer** — "Prices as of {PRICING_AS_OF}, USD, standard API tier,
   30-day month; cache reads modeled, cache writes/batch/long-context tiers are not"
   + link to sources.

**Shareable URLs:** inputs sync to query params (`u`, `r`, `in`, `out`, `cache`).
Read once from `ActivatedRoute.snapshot.queryParamMap` at init (server-safe); written
back debounced with `Router.navigate(..., { replaceUrl: true, queryParamsHandling: 'merge' })`
**guarded to the browser platform** — prerender must never navigate.

**SEO:** copy the article-detail pattern (the repo's only precedent): `Title` + `Meta`
in a constructor (server-safe, baked into prerendered HTML), canonical + hreflang
(en, fr, x-default) `<link>`s via `data-seo` attributes, JSON-LD `WebApplication`
(name, description, url, offers: free), cleanup in `DestroyRef.onDestroy`.

### Tools index page (`tools.component`)

Minimal: hero (title + one-paragraph pitch), a card grid with a single card linking to
the calculator (reuses existing surface/elevation/card tokens), and a "more tools are
on the way" line. Sets Title + meta description + canonical the same way.

### Routing & prerender

- `app.routes.ts`: eager imports (repo convention), placed before the `**` catch-all:
  `{ path: 'tools', data: { breadcrumb: 'Tools' }, children: [ { path: '', component: ToolsComponent }, { path: 'ai-cost-calculator', component: AiCostCalculatorComponent, data: { breadcrumb: 'AI Cost Calculator' } } ] }`
- `app.routes.server.ts`: `{ path: 'tools', renderMode: RenderMode.Prerender }` and
  `{ path: 'tools/ai-cost-calculator', renderMode: RenderMode.Prerender }` before the
  `**` entry. Bare paths only — locales are per-locale builds.

### Sitemap

`scripts/build-content.mjs` currently emits only article URLs. Add a `STATIC_ROUTES`
array (`''`, `projects`, `about`, `contact`, `articles`, `tools`,
`tools/ai-cost-calculator`) emitted in `writeSitemap` with en + fr + x-default
hreflang alternates and no `<lastmod>` (no meaningful date). Update
`scripts/build-content.spec.mjs` to cover the static block.

### i18n

Every new template string carries an explicit `@@id` (prefix `tools*` / `aiCalc*`);
TS-side labels use `` $localize`:@@id:text` ``. After implementation:
`pnpm ng extract-i18n --output-path src/locale`, then hand-add French entries to
`src/locale/messages.fr.json` (done inline by the coordinator, not by parallel agents —
single-file collision avoidance). `@@navTools` already exists in templates; verify it
has an fr entry ("Outils"). Model/provider product names are not translated.

## Error handling

- All numeric parsing clamps to non-negative finite numbers; garbage input → 0, the
  table simply shows $0.00 rows rather than NaN.
- Malformed/out-of-range query params fall back to defaults silently.
- No network calls → no loading/error states.

## Testing

- `cost-engine.spec.ts`: per-request math, cache-share blending, null cache-read
  fallback, zero/NaN clamping, sort order of `estimateAll`.
- `ai-cost-calculator.component.spec.ts`: renders a row per model, preset click updates
  input signals + deselects on manual edit, query-param initialization, cheapest-row
  highlight, SEO title set. Conventions: standalone imports, `provideRouter([])`,
  `fixture.componentRef.setInput` where needed.
- `tools.component.spec.ts`: renders the calculator card + routerLink.
- Gate: `pnpm build` (both locales prerender /tools routes), full Karma run must show
  zero NEW failures (15 pre-existing failures are known tech debt).

## Risks

- Component-style budget is 16 kB warn / 20 kB error — keep calculator CSS lean.
- Initial bundle already 819.96 kB vs 700 kB warn; eager /tools routes add to it.
  Accepted for v1 (consistency with repo convention outranks the warn budget; the
  1.2 MB error line is far away). Revisit lazy-loading as its own decision later.
- Pricing staleness — mitigated by `PRICING_AS_OF` in the UI + source links, and a
  monthly re-verify note in the maintenance docs.
