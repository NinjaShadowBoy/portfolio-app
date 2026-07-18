# AI/LLM Cost Calculator — Implementation Plan

**Date:** 2026-07-18 · Companion to `2026-07-18-ai-cost-calculator-design.md`.
Small team by explicit user constraint: 3 implementation agents, max 2 concurrent.

## Task A — Pricing data + cost engine (runs first, defines the contract)

Files: `src/app/features/tools/ai-cost-calculator/llm-pricing.data.ts`,
`cost-engine.ts`, `cost-engine.spec.ts`.

Exports (the frozen contract Tasks B/C build against):
- `LlmModelPricing`, `PRICING_AS_OF: string`, `LLM_PRICING: LlmModelPricing[]` (17 models, data in design doc §Pricing data — verified 2026-07-18 research pass).
- `CalculatorInputs`, `CostEstimate`, `estimateCost(model, inputs)`, `estimateAll(models, inputs)` (sorted `costPerMonth` asc).
- Pure TS only — no Angular imports in `cost-engine.ts` / `llm-pricing.data.ts`.

## Task B — Calculator page (after A)

Files: `ai-cost-calculator.component.{ts,html,css,spec.ts}` in the same folder.
Presets, signal inputs, results table, assumptions footer, query-param sync
(browser-guarded writes), full SEO block (Title/Meta/canonical/hreflang/JSON-LD
`WebApplication`, `data-seo` attrs, onDestroy cleanup). i18n `@@aiCalc*` ids.

## Task C — Tools index + integration (parallel with B)

Files: `tools.component.{ts,html,css,spec.ts}`; edits to `app.routes.ts`,
`app.routes.server.ts`, `header.component.html` (flip BOTH dormant `@if (false)`
Tools slots — desktop ~line 33, mobile ~line 254), `footer.component.html`
(add Tools + Articles links), `scripts/build-content.mjs` (`STATIC_ROUTES` in
`writeSitemap`), `scripts/build-content.spec.mjs`.
Collision rule: C never touches B's folder; B never touches C's files.

## Coordinator (inline, after B+C)

1. `pnpm ng extract-i18n --output-path src/locale`; hand-add all new fr entries to
   `src/locale/messages.fr.json` (single-writer rule for this file).
2. `pnpm build` — verify /tools + /tools/ai-cost-calculator prerender in en and fr
   output; grep dist HTML for title/canonical/JSON-LD.
3. `node --test scripts/build-content.spec.mjs` + full Karma run — zero new failures.
4. Commit; update memory.
