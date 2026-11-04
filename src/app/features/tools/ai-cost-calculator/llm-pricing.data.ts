/**
 * Static LLM API pricing table for the AI cost calculator.
 *
 * All prices are USD per 1 million tokens on each provider's standard
 * (non-batch, base-tier) API. The table is refreshed manually — re-verify
 * against every `sourceUrl` monthly and bump `PRICING_AS_OF` accordingly;
 * the date is displayed in the UI so stale data is self-disclosing.
 *
 * Deliberate exclusions: preview models (Mistral Large 4, Qwen3.8 27B on
 * Groq) are omitted because their prices are not final, and Groq's Llama
 * 3.3 70B is omitted because it is now "Contact Sales".
 */

/** Pricing row for a single model, as published on the provider's official page. */
export interface LlmModelPricing {
  /** Stable slug used in URLs and tests, e.g. 'claude-sonnet-5-5'. */
  id: string;
  /** Provider display name, e.g. 'OpenAI', 'Anthropic'. */
  provider: string;
  /** Model display name — a product name, never localized. */
  name: string;
  /** USD per 1M input tokens (standard, non-batch, base tier). */
  inputPerMTok: number;
  /** USD per 1M output tokens. */
  outputPerMTok: number;
  /** USD per 1M cached input tokens; null when the provider publishes no flat cache-read rate. */
  cacheReadPerMTok: number | null;
  /** Context window in tokens; null if not published. */
  contextWindow: number | null;
  /** Official pricing page the numbers were transcribed from. */
  sourceUrl: string;
  /** Short caveat surfaced in the UI (e.g. intro pricing, long-context surcharge). */
  note?: string;
}

/** Date the prices below were last verified against the official pricing pages. */
export const PRICING_AS_OF = '2026-10-26';

/** Verified pricing rows, one per model (18 total). */
export const LLM_PRICING: LlmModelPricing[] = [
  {
    id: 'gpt-6-astra',
    provider: 'OpenAI',
    name: 'GPT-6 Astra',
    inputPerMTok: 10,
    outputPerMTok: 50,
    cacheReadPerMTok: 1,
    contextWindow: 1050000,
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
    note: 'Above 272K input tokens: $20 in / $75 out',
  },
  {
    id: 'gpt-6-1-sol',
    provider: 'OpenAI',
    name: 'GPT-6.1 Sol',
    inputPerMTok: 2,
    outputPerMTok: 10,
    cacheReadPerMTok: 0.1,
    contextWindow: 1050000,
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
    note: 'Above 272K input tokens: $4 in / $15 out',
  },
  {
    id: 'gpt-6-luna',
    provider: 'OpenAI',
    name: 'GPT-6 Luna',
    inputPerMTok: 0.1,
    outputPerMTok: 0.5,
    cacheReadPerMTok: 0.01,
    contextWindow: 1050000,
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
    note: 'Above 272K input tokens: $0.20 in / $0.75 out',
  },
  {
    id: 'claude-fable-5-1',
    provider: 'Anthropic',
    name: 'Claude Fable 5.1',
    inputPerMTok: 10,
    outputPerMTok: 50,
    cacheReadPerMTok: 0.25,
    contextWindow: 1000000,
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  {
    id: 'claude-opus-5-5',
    provider: 'Anthropic',
    name: 'Claude Opus 5.5',
    inputPerMTok: 4,
    outputPerMTok: 20,
    cacheReadPerMTok: 0.2,
    contextWindow: 1000000,
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  {
    id: 'claude-sonnet-5-5',
    provider: 'Anthropic',
    name: 'Claude Sonnet 5.5',
    inputPerMTok: 2,
    outputPerMTok: 10,
    cacheReadPerMTok: 0.1,
    contextWindow: 1000000,
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  {
    id: 'claude-haiku-5-5',
    provider: 'Anthropic',
    name: 'Claude Haiku 5.5',
    inputPerMTok: 0.1,
    outputPerMTok: 0.5,
    cacheReadPerMTok: 0.01,
    contextWindow: null,
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
    note: 'Prompts above 100K tokens: $0.50 in / $2.50 out',
  },
  {
    id: 'gemini-4-argon',
    provider: 'Google',
    name: 'Gemini 4 Argon',
    inputPerMTok: 2,
    outputPerMTok: 10,
    cacheReadPerMTok: 0.1,
    contextWindow: 1000000,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    note: 'Intro pricing through 2026-11-30; $4 in / $20 out afterwards',
  },
  {
    id: 'gemini-3-8-flash',
    provider: 'Google',
    name: 'Gemini 3.8 Flash',
    inputPerMTok: 0.75,
    outputPerMTok: 3.75,
    cacheReadPerMTok: 0.075,
    contextWindow: null,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    note: 'Intro pricing through 2026-12-31; $1.50 in / $7.50 out afterwards',
  },
  {
    id: 'gemini-3-5-flash-lite',
    provider: 'Google',
    name: 'Gemini 3.5 Flash-Lite',
    inputPerMTok: 0.3,
    outputPerMTok: 2.5,
    cacheReadPerMTok: 0.03,
    contextWindow: null,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  {
    id: 'deepseek-v4-pro',
    provider: 'DeepSeek',
    name: 'DeepSeek V4 Pro',
    inputPerMTok: 1.32,
    outputPerMTok: 3.96,
    cacheReadPerMTok: 0.044,
    contextWindow: 1000000,
    sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
    note: 'Peak-hour price; half price off-peak and on weekends',
  },
  {
    id: 'deepseek-v4-1-flash',
    provider: 'DeepSeek',
    name: 'DeepSeek V4.1 Flash',
    inputPerMTok: 0.3,
    outputPerMTok: 1.2,
    cacheReadPerMTok: 0.006,
    contextWindow: 1000000,
    sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
    note: 'Peak-hour price; half price off-peak and on weekends',
  },
  {
    id: 'mistral-medium-3-5',
    provider: 'Mistral',
    name: 'Mistral Medium 3.5',
    inputPerMTok: 1.5,
    outputPerMTok: 7.5,
    cacheReadPerMTok: 0.15,
    contextWindow: 256000,
    sourceUrl: 'https://docs.mistral.ai/inference/pricing',
  },
  {
    id: 'mistral-small-4',
    provider: 'Mistral',
    name: 'Mistral Small 4',
    inputPerMTok: 0.15,
    outputPerMTok: 0.6,
    cacheReadPerMTok: 0.015,
    contextWindow: 256000,
    sourceUrl: 'https://docs.mistral.ai/inference/pricing',
  },
  {
    id: 'grok-4-7',
    provider: 'xAI',
    name: 'Grok 4.7',
    inputPerMTok: 2,
    outputPerMTok: 6,
    cacheReadPerMTok: 0.5,
    contextWindow: 500000,
    sourceUrl: 'https://docs.x.ai/docs/models',
    note: 'Roughly 2x price for prompts above 200K tokens',
  },
  {
    id: 'grok-4-3',
    provider: 'xAI',
    name: 'Grok 4.3',
    inputPerMTok: 1.25,
    outputPerMTok: 2.5,
    cacheReadPerMTok: 0.2,
    contextWindow: 1000000,
    sourceUrl: 'https://docs.x.ai/docs/models',
    note: 'Roughly 2x price for prompts above 200K tokens',
  },
  {
    id: 'gpt-oss-120b-groq',
    provider: 'Groq',
    name: 'GPT-OSS 120B (Groq)',
    inputPerMTok: 0.15,
    outputPerMTok: 0.6,
    cacheReadPerMTok: null,
    contextWindow: 131072,
    sourceUrl: 'https://console.groq.com/docs/models',
    note: 'Open-weights model served on Groq hardware',
  },
  {
    id: 'gpt-oss-20b-groq',
    provider: 'Groq',
    name: 'GPT-OSS 20B (Groq)',
    inputPerMTok: 0.075,
    outputPerMTok: 0.3,
    cacheReadPerMTok: null,
    contextWindow: 131072,
    sourceUrl: 'https://console.groq.com/docs/models',
    note: 'Open-weights model served on Groq hardware',
  },
];
